export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  assigneeId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  message: string;
  read: boolean;
  createdAt: Date;
}
