export interface UserProfile {
    username: string;
    email?: string;
}

export interface AuthState {
    isAuthenticated: boolean;
    userProfile: UserProfile | null;
}