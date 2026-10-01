export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  roles: string[];
}

export interface JwtPayload {
  sub: string;
  email: string;
  roles: string[];
  type?: 'access' | 'refresh';
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    roles: string[];
  };
  tokens: AuthTokens;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}
