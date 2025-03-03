type StreamParserState =
  | WaitingForAction
  | ParsingActionHeader
  | ParsingActionBody;

type WaitingForAction = {
  type: 'waiting for action';
};

type ParsingActionHeader = {
  type: 'parsing action header';
  header: string;
};

type ParsingActionBody = {
  type: 'parsing action body';
  body: string;
};

export type StreamResult =
  | { type: 'text'; content: string }
  | { type: 'action'; content: string };

export type BufferStreamResult =
  | { type: 'text'; content: string }
  | { type: 'action start'; content: string }
  | { type: 'action middle'; content: string }
  | { type: 'action end'; content: string };

export class StreamParser {
  private static readonly ACTION_START = '<mimo-action>';
  private static readonly ACTION_END = '</mimo-action>';
  private static readonly ACTION_START_LENGTH =
    StreamParser.ACTION_START.length;
  private static readonly ACTION_END_LENGTH = StreamParser.ACTION_END.length;

  private results: StreamResult[] = [];
  private bufferResults: BufferStreamResult[] = [];
  private state: StreamParserState = { type: 'waiting for action' };

  reset() {
    this.results = [];
    this.bufferResults = [];
    this.state = { type: 'waiting for action' };
  }

  addChunk(chunk: string) {
    if (this.state.type === 'parsing action header') {
      const buffer = this.state.header + chunk;

      if (buffer.length >= StreamParser.ACTION_START.length) {
        if (buffer.startsWith(StreamParser.ACTION_START)) {
          this.state = {
            type: 'parsing action body',
            body: buffer.slice(StreamParser.ACTION_START_LENGTH),
          };
          this.bufferResults.push({
            type: 'action start',
            content: buffer.slice(StreamParser.ACTION_START_LENGTH),
          });
          this.addChunk(''); // Process the body immediately
        } else {
          this.state = { type: 'waiting for action' };
          this.results.push({ type: 'text', content: buffer });
          this.bufferResults.push({ type: 'text', content: buffer });
        }
      } else {
        this.state = {
          type: 'parsing action header',
          header: buffer,
        };
      }
      return;
    }

    // As long as we don't have an action header yet, we're waiting until a starting '<' arrives
    if (this.state.type === 'waiting for action') {
      const firstBracket = chunk.indexOf('<');

      if (firstBracket === -1) {
        this.results.push({ type: 'text', content: chunk });
        this.bufferResults.push({ type: 'text', content: chunk });
        return;
      }

      if (firstBracket > 0) {
        this.results.push({
          type: 'text',
          content: chunk.slice(0, firstBracket),
        });
        this.bufferResults.push({
          type: 'text',
          content: chunk.slice(0, firstBracket),
        });
      }

      this.state = {
        type: 'parsing action header',
        header: chunk.slice(firstBracket),
      };

      this.addChunk(''); // Process the header immediately
      return;
    }

    // Try to parse the action body until it's complete, or until we detect that it's not a valid action header
    if (this.state.type === 'parsing action body') {
      const buffer = this.state.body + chunk;
      // Try to find the end of the action
      const endIndex = buffer.indexOf(StreamParser.ACTION_END);

      if (endIndex !== -1) {
        // We found the end, so extract the action content
        this.results.push({
          type: 'action',
          content: buffer.slice(0, endIndex),
        });
        if (
          this.bufferResults[this.bufferResults.length - 1] &&
          (this.bufferResults[this.bufferResults.length - 1].type ===
            'action middle' ||
            this.bufferResults[this.bufferResults.length - 1].type ===
              'action start')
        ) {
          this.bufferResults.pop();
        }
        this.bufferResults.push({
          type: 'action end',
          content: buffer.slice(0, endIndex),
        });

        const remaining = buffer.slice(
          endIndex + StreamParser.ACTION_END_LENGTH,
        );
        if (remaining) {
          this.state = { type: 'waiting for action' };
          this.addChunk(remaining);
        } else {
          this.state = { type: 'waiting for action' };
        }
      } else {
        // Haven't found the end yet, keep accumulating the body

        this.bufferResults.push({
          type: 'action middle',
          content: buffer,
        });
        this.state = {
          type: 'parsing action body',
          body: buffer,
        };
      }
    }
  }

  consume(): StreamResult[] {
    const results = this.results;
    this.results = [];
    return results;
  }

  consumeBuffer(): BufferStreamResult[] {
    const results = this.bufferResults;
    this.bufferResults = [];
    return results;
  }
}


export function updateMessages(
  messages: ChatMessage[],
  parsingResults: BufferStreamResult[],
): ChatMessage[] {
  parsingResults.forEach((result) => {
    const lastMessage = messages[messages.length - 1];
    switch (true) {
      case result.type === 'text' && lastMessage?.type === 'text':
        lastMessage.content += result.content;
        break;
      case result.type === 'text' && result.content.trim() !== '':
        messages.push({
          type: 'text',
          role: 'assistant',
          content: result.content,
          messageId: getRandomInt(0, 100000),
        });
        break;
      case result.type === 'action start':
      case result.type === 'action middle':
      case result.type === 'action end': {
        const lastMessage =
          result.type === 'action start' ? null : messages[messages.length - 1];
        const explanation = extractExplanation(result.content);
        if (
          explanation &&
          !(
            lastMessage &&
            lastMessage.type === 'action' &&
            lastMessage.actionStatus === 'parsing in progress' &&
            lastMessage.action.type !== 'explanation'
          )
        ) {
          if (
            lastMessage &&
            lastMessage.type === 'action' &&
            lastMessage.action.type === 'explanation' &&
            lastMessage.actionStatus === 'parsing in progress'
          ) {
            lastMessage.action.explanation = explanation.explanation;
            lastMessage.actionStatus =
              result.type === 'action end'
                ? 'parsing finished'
                : 'parsing in progress';
          } else {
            messages.push({
              type: 'action',
              role: 'assistant',
              action: {
                type: 'explanation',
                explanation: explanation.explanation,
                actionId: getRandomInt(0, 100000),
              },
              messageId: getRandomInt(0, 100000),
              actionStatus:
                result.type === 'action end'
                  ? 'parsing finished'
                  : 'parsing in progress',
            });
          }
        }

        const confirmation = extractConfirmation(result.content);
        if (
          confirmation &&
          !(
            lastMessage &&
            lastMessage.type === 'action' &&
            lastMessage.actionStatus === 'parsing in progress' &&
            lastMessage.action.type !== 'confirmation'
          )
        ) {
          if (
            lastMessage &&
            lastMessage.type === 'action' &&
            lastMessage.action.type === 'confirmation' &&
            lastMessage.actionStatus === 'parsing in progress'
          ) {
            lastMessage.action.confirmation = confirmation.confirmation;
            lastMessage.actionStatus =
              result.type === 'action end'
                ? 'parsing finished'
                : 'parsing in progress';
          } else {
            messages.push({
              type: 'action',
              role: 'assistant',
              action: {
                type: 'confirmation',
                confirmation: confirmation.confirmation,
                actionId: getRandomInt(0, 100000),
              },
              messageId: getRandomInt(0, 100000),
              actionStatus:
                result.type === 'action end'
                  ? 'parsing finished'
                  : 'parsing in progress',
            });
          }
        }

        const fileReplace = extractFileReplace(result.content);
        if (
          fileReplace &&
          !(
            lastMessage &&
            lastMessage.type === 'action' &&
            lastMessage.actionStatus === 'parsing in progress' &&
            lastMessage.action.type !== 'replace_file'
          )
        ) {
          if (
            lastMessage &&
            lastMessage.type === 'action' &&
            lastMessage.action.type === 'replace_file' &&
            lastMessage.actionStatus === 'parsing in progress'
          ) {
            lastMessage.action.newContent = fileReplace.newContent;
            lastMessage.action.oldContent = fileReplace.oldContent;
            lastMessage.actionStatus =
              result.type === 'action end'
                ? 'parsing finished'
                : 'parsing in progress';
          } else {
            messages.push({
              type: 'action',
              role: 'assistant',
              action: {
                type: 'replace_file',
                path: fileReplace.path,
                oldContent: fileReplace.oldContent || '',
                newContent: fileReplace.newContent || '',
                actionId: getRandomInt(0, 100000),
              },
              messageId: getRandomInt(0, 100000),
              actionStatus:
                result.type === 'action end'
                  ? 'parsing finished'
                  : 'parsing in progress',
            });
          }
        }
        const fileAdd = extractFileAdd(result.content);
        if (
          fileAdd &&
          !(
            lastMessage &&
            lastMessage.type === 'action' &&
            lastMessage.actionStatus === 'parsing in progress' &&
            lastMessage.action.type !== 'add_file'
          )
        ) {
          if (
            lastMessage &&
            lastMessage.type === 'action' &&
            lastMessage.action.type === 'add_file' &&
            lastMessage.actionStatus === 'parsing in progress'
          ) {
            lastMessage.action.newContent = fileAdd.newContent;
            lastMessage.actionStatus =
              result.type === 'action end'
                ? 'parsing finished'
                : 'parsing in progress';
          } else {
            messages.push({
              type: 'action',
              role: 'assistant',
              action: {
                type: 'add_file',
                path: fileAdd.path,
                newContent: fileAdd.newContent,
                actionId: getRandomInt(0, 100000),
              },
              messageId: getRandomInt(0, 100000),
              actionStatus:
                result.type === 'action end'
                  ? 'parsing finished'
                  : 'parsing in progress',
            });
          }
        }
        const fileRemove = extractFileRemove(result.content);
        if (
          fileRemove &&
          !(
            lastMessage &&
            lastMessage.type === 'action' &&
            lastMessage.actionStatus === 'parsing in progress' &&
            lastMessage.action.type !== 'remove_file'
          )
        ) {
          if (
            lastMessage &&
            lastMessage.type === 'action' &&
            lastMessage.action.type === 'remove_file' &&
            lastMessage.actionStatus === 'parsing in progress'
          ) {
            lastMessage.action.path = fileRemove.path;
            lastMessage.actionStatus =
              result.type === 'action end'
                ? 'parsing finished'
                : 'parsing in progress';
          } else {
            messages.push({
              type: 'action',
              role: 'assistant',
              action: {
                type: 'remove_file',
                path: fileRemove.path,
                actionId: getRandomInt(0, 100000),
              },
              messageId: getRandomInt(0, 100000),
              actionStatus:
                result.type === 'action end'
                  ? 'parsing finished'
                  : 'parsing in progress',
            });
          }
        }
        const packageInstall = extractPackageInstall(result.content);
        if (
          packageInstall &&
          !(
            lastMessage &&
            lastMessage.type === 'action' &&
            lastMessage.actionStatus === 'parsing in progress' &&
            lastMessage.action.type !== 'install_package'
          )
        ) {
          if (
            lastMessage &&
            lastMessage.type === 'action' &&
            lastMessage.action.type === 'install_package' &&
            lastMessage.actionStatus === 'parsing in progress'
          ) {
            lastMessage.action.package = packageInstall.packageName;
            lastMessage.actionStatus =
              result.type === 'action end'
                ? 'parsing finished'
                : 'parsing in progress';
          } else {
            messages.push({
              type: 'action',
              role: 'assistant',
              action: {
                type: 'install_package',
                package: packageInstall.packageName,
                actionId: getRandomInt(0, 100000),
              },
              messageId: getRandomInt(0, 100000),
              actionStatus:
                result.type === 'action end'
                  ? 'parsing finished'
                  : 'parsing in progress',
            });
          }
        }
        const packageUninstall = extractPackageUninstall(result.content);
        if (
          packageUninstall &&
          !(
            lastMessage &&
            lastMessage.type === 'action' &&
            lastMessage.actionStatus === 'parsing in progress' &&
            lastMessage.action.type !== 'uninstall_package'
          )
        ) {
          if (
            lastMessage &&
            lastMessage.type === 'action' &&
            lastMessage.action.type === 'uninstall_package' &&
            lastMessage.actionStatus === 'parsing in progress'
          ) {
            lastMessage.action.package = packageUninstall.packageName;
            lastMessage.actionStatus =
              result.type === 'action end'
                ? 'parsing finished'
                : 'parsing in progress';
          } else {
            messages.push({
              type: 'action',
              role: 'assistant',
              action: {
                type: 'uninstall_package',
                package: packageUninstall.packageName,
                actionId: getRandomInt(0, 100000),
              },
              messageId: getRandomInt(0, 100000),
              actionStatus:
                result.type === 'action end'
                  ? 'parsing finished'
                  : 'parsing in progress',
            });
          }
        }
      }
    }
  });

  return messages;
}

export function getRandomInt(min: number, max: number) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function extractFileReplace(content: string) {
  // Match path
  const pathRegex = /<llm_action_replace_file\s+path="([^"]*)"/;
  const pathMatch = pathRegex.exec(content);
  if (!pathMatch) return null;
  const path = pathMatch[1];

  // Match old content if it exists
  const oldContentRegex =
    /<old_lines_to_replace>([\s\S]*?)(?:<\/old_lines_to_replace>|$)/;
  const oldContentMatch = oldContentRegex.exec(content);
  const oldContent = oldContentMatch ? oldContentMatch[1] : undefined;

  // Match new content if it exists
  const newContentRegex =
    /<new_lines_to_add>([\s\S]*?)(?:<\/new_lines_to_add>|$)/;
  const newContentMatch = newContentRegex.exec(content);
  const newContent = newContentMatch ? newContentMatch[1] : undefined;

  return {
    path,
    oldContent,
    newContent,
  };
}

function extractExplanation(content: string) {
  // Match path
  const explanationRegex =
    /<mimo-explanation>([\s\S]*?)(?:<\/mimo-explanation>|$)/;
  const explanationMatch = explanationRegex.exec(content);
  if (!explanationMatch) return null;
  const explanation = explanationMatch[1];

  return {
    explanation,
  };
}

function extractConfirmation(content: string) {
  // Match path
  const confirmationRegex =
    /<mimo-confirmation>([\s\S]*?)(?:<\/mimo-confirmation>|$)/;
  const confirmationMatch = confirmationRegex.exec(content);
  if (!confirmationMatch) return null;
  const confirmation = confirmationMatch[1];

  return {
    confirmation,
  };
}

function extractFileAdd(content: string) {
  // Match path
  const pathRegex = /<llm_action_add_file\s+path="([^"]*)"/;
  const pathMatch = pathRegex.exec(content);
  if (!pathMatch) return null;
  const path = pathMatch[1];

  // Match new content if it exists
  const newContentRegex =
    /<new_lines_to_add>([\s\S]*?)(?:<\/new_lines_to_add>|$)/;
  const newContentMatch = newContentRegex.exec(content);
  const newContent = newContentMatch ? newContentMatch[1] : undefined;

  return {
    path,
    newContent,
  };
}

function extractFileRemove(content: string) {
  // Match path
  const pathRegex = /<llm_action_remove_file\s+path="([^"]*)"/;
  const pathMatch = pathRegex.exec(content);
  if (!pathMatch) return null;
  const path = pathMatch[1];

  return {
    path,
  };
}

function extractPackageInstall(content: string) {
  const regex =
    /<llm_action_install_package\s+name="([^"]*)">\s*<\/llm_action_install_package>/;
  const match = regex.exec(content);
  if (!match) return null;

  const [_, name] = match;
  return {
    packageName: name,
  };
}

function extractPackageUninstall(content: string) {
  const regex =
    /<llm_action_uninstall_package\s+name="([^"]*)">\s*<\/llm_action_uninstall_package>/;
  const match = regex.exec(content);
  if (!match) return null;

  const [_, name] = match;
  return {
    packageName: name,
  };
}

export type ActionStatus =
  | 'parsing in progress'
  | 'parsing finished'
  | 'applying action'
  | 'action applied';

export type ChatMessage =
  | {
      type: 'text';
      role: ChatRoles;
      content: string;
      messageId: number;
    }
  | {
      type: 'text with linked element';
      role: ChatRoles;
      content: string;
      messageId: number;
      linkedElement: {
        tag: string;
        path: string;
        line: number;
      };
    }
  | {
      type: 'aborted';
      role: ChatRoles;
      content: string;
      messageId: number;
    }
  | {
      type: 'build error';
      role: ChatRoles;
      logs: any[];
      messageId: number;
    }
  | {
      type: 'client side error';
      role: ChatRoles;
      logs: any[];
      messageId: number;
    }
  | {
      type: 'action';
      role: 'assistant';
      messageId: number;
      actionStatus: ActionStatus;
      action: ChatAction;
    }
  | {
      messageId: number;
      role: 'assistant';
      type: 'project setup';
      machineConnectionState: 'connecting' | 'connected';
      filesLoadState: 'idle' | 'loading' | 'loaded';
      packageInstallState: 'idle' | 'installing' | 'installed';
    };

type ChatAction =
  | { type: 'explanation'; explanation?: string; actionId: number }
  | { type: 'add_file'; path: string; newContent?: string; actionId: number }
  | { type: 'remove_file'; path: string; actionId: number }
  | {
      type: 'replace_file';
      path: string;
      oldContent?: string;
      newContent?: string;
      actionId: number;
    }
  | { type: 'install_package'; package: string; actionId: number }
  | { type: 'uninstall_package'; package: string; actionId: number }
  | { type: 'confirmation'; confirmation?: string; actionId: number };

export type ChatRoles = 'assistant' | 'user';