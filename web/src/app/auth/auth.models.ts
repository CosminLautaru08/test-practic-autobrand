export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
}

export interface AuthProfile {
  id: number;
  username: string;
  createdAt: string;
}
