// This file is for testing the TypeScript error overlay plugin

// This function has a type error - it should return a string but returns a number
function greet(name: string): string {
  return 42; // Type error: Type 'number' is not assignable to type 'string'
}

// This variable has a type error - trying to assign a number to a string
const username: string = 123; // Type error: Type 'number' is not assignable to type 'string'

export { greet, username }; 


