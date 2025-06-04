export interface UserModel {
  name: string;
  email: string;
}

export type FileDropProps = {
  onFilesSelected?: (files: File[]) => void;
};