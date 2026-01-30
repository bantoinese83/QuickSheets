declare module "intuit-oauth" {
  interface OAuthConfig {
    clientId: string;
    clientSecret: string;
    environment?: "sandbox" | "production";
    redirectUri: string;
  }

  interface TokenResponse {
    access_token: string;
    refresh_token: string;
    expires_in?: number;
    sub?: string;
  }

  interface OAuthClient {
    authorizeUri(options: { scope: string[]; state?: string }): string;
    createToken(authCode: string): Promise<{ getJson: () => TokenResponse }>;
  }

  interface OAuthClientConstructor {
    new (config: OAuthConfig): OAuthClient;
    scopes: { Accounting: string };
  }

  const OAuthClient: OAuthClientConstructor;
  export default OAuthClient;
}
