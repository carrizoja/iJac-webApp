export interface UserRequest {
  uid: string;
  email: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  organizationId?: string;
  role?: string;
}
