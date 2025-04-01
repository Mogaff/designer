import { User } from '../shared/schema';

declare global {
  namespace Express {
    // Properly extend the user interface without causing recursion
    interface User {
      id: number;
      username: string;
      password: string;
    }
  }
}