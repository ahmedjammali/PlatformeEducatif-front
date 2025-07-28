// notification.model.ts

export interface Notification {
  _id: string;
  title: string;
  content: string;
  type: NotificationType;
  priority: NotificationPriority;
  targetAudience: TargetAudience;
  targetClass?: {
    _id: string;
    name: string;
    grade: string;
  };
  attachments: NotificationAttachment[];
  readBy: ReadByUser[];
  publishDate: Date | string;
  expiryDate?: Date | string;
  isActive: boolean;
  createdBy: {
    _id: string;
    name: string;
    role: string;
  };
  createdAt: Date | string;
  updatedAt: Date | string;
  
  // Virtual fields
  isExpired?: boolean;
  readCount?: number;
  isRead?: boolean;
}

export interface NotificationAttachment {
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  url: string;
  uploadedAt: Date | string;
}

export interface ReadByUser {
  user: string;
  readAt: Date | string;
}

export enum NotificationType {
  GENERAL = 'general',
  CLASS = 'class',
  EXAM = 'exam',
  SCHEDULE = 'schedule',
  ANNOUNCEMENT = 'announcement'
}

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

export enum TargetAudience {
  ALL = 'all',
  STUDENTS = 'students',
  TEACHERS = 'teachers',
  SPECIFIC_CLASS = 'specific_class'
}

export interface CreateNotificationDTO {
  title: string;
  content: string;
  type?: NotificationType;
  priority?: NotificationPriority;
  targetAudience: TargetAudience;
  targetClass?: string;
  publishDate?: Date | string;
  expiryDate?: Date | string;
  attachments?: File[];
}

export interface UpdateNotificationDTO {
  title?: string;
  content?: string;
  type?: NotificationType;
  priority?: NotificationPriority;
  expiryDate?: Date | string;
  isActive?: boolean;
}

export interface NotificationFilters {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
  type?: NotificationType;
  priority?: NotificationPriority;
  targetAudience?: TargetAudience;
}

export interface NotificationResponse {
  success: boolean;
  message?: string;
  notification?: Notification;
  notifications?: Notification[];
  pagination?: {
    total: number;
    pages: number;
    currentPage: number;
    limit: number;
  };
}

export interface NotificationStats {
  total: number;
  avgReadCount: number;
  byType: Array<{
    _id: string;
    count: number;
  }>;
  byPriority: Array<{
    _id: string;
    count: number;
  }>;
}