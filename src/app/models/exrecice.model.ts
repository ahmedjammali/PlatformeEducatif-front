import { Class } from "./class.model";
import { School } from "./school.model";
import { Subject } from "./subject.model";
import { User } from "./user.model";

export interface Exercise {
  _id?: string;
  title: string;
  type: 'qcm' | 'fill_blanks';
  subject: Subject ;
  class: Class | string;
  createdBy: User | string;
  school: School | string;
  difficulty: 'easy' | 'medium' | 'hard';
  isActive: boolean;
  qcmQuestions?: QCMQuestion[];
  fillBlankQuestions?: FillBlankQuestion[];
  totalPoints: number;
  metadata?: ExerciseMetadata;
  tags?: string[];
  dueDate?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface QCMQuestion {
  questionText: string;
  options: QCMOption[];
  points: number;
  explanation?: string;
}

export interface QCMOption {
  text: string;
  isCorrect: boolean;
  _id?: string;
}

export interface FillBlankQuestion {
  sentence: string;
  blanks: Blank[];
  points: number;
  hint?: string;
}

export interface Blank {
  position: number;
  correctAnswer: string;
  acceptableAnswers?: string[];
}

export interface ExerciseMetadata {
  instructions?: string;
  estimatedTime?: number;
  maxAttempts?: number;
  showAnswersAfterCompletion?: boolean;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
}

export interface ExerciseSubmission {
  answers: any[]; // For QCM: string[], For Fill blanks: { blanks: string[] }[]
}