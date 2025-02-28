export interface User {
  uid: string;
  displayName: string;
  photoURL?: string;
  email?: string;
}

export interface Message {
  id: string;
  text: string;
  createdAt: Date;
  uid: string;
  displayName: string;
  photoURL?: string;
}