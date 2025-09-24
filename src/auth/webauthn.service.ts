import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import type {
  GenerateRegistrationOptionsOpts,
  VerifyRegistrationResponseOpts,
  GenerateAuthenticationOptionsOpts,
  VerifyAuthenticationResponseOpts,
} from "@simplewebauthn/server";
import { randomBytes } from "crypto";

type ChallengeType = "registration" | "authentication";

@Injectable()
export class WebAuthnService {
  constructor(private prisma: PrismaService) {}

  private challenges = new Map<
    string,
    {
      type: ChallengeType;
      challenge: string;
      userId?: number;
      createdAt: number;
      expectedOrigin: string;
      expectedRPID: string;
    }
  >();

  private rpID(fallback?: string) {
    return fallback || process.env.WEBAUTHN_RP_ID || "localhost";
  }
  private origin(fallback?: string) {
    return (
      fallback ||
      process.env.WEBAUTHN_ORIGIN ||
      `http://localhost:${process.env.PORT || 3006}`
    );
  }
  private rpName() {
    return process.env.WEBAUTHN_RP_NAME || "ZehnGoh";
  }

  private toBase64Url(buf: Buffer) {
    return buf
      .toString("base64")
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
  }

  private fromBase64Url(str: string) {
    const pad = 4 - (str.length % 4 || 4);
    const base64 = str.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat(pad);
    return Buffer.from(base64, "base64");
  }

  private userHandleBytes(userHandle?: string): Uint8Array {
    const id = userHandle ? this.fromBase64Url(userHandle) : randomBytes(32);
    return new Uint8Array(id);
  }

  async createRegistrationOptions(input?: {
    displayName?: string;
    rpID?: string;
    origin?: string;
  }) {
    // Create new user in advance (no phone/email required)
    const webauthnUserId = this.toBase64Url(randomBytes(32));
    const user = await this.prisma.user.create({
      data: { webauthnUserId },
    });

    const expectedRPID = this.rpID(input?.rpID);
    const expectedOrigin = this.origin(input?.origin);
    const opts: GenerateRegistrationOptionsOpts = {
      rpName: this.rpName(),
      rpID: expectedRPID,
      userID: new Uint8Array(this.userHandleBytes(webauthnUserId)),
      userName: `user-${user.id}`,
      userDisplayName: input?.displayName || `User ${user.id}`,
      attestationType: "none",
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "required",
      },
    };
    const options = await generateRegistrationOptions(opts);
    const sessionId = this.toBase64Url(randomBytes(16));
    this.challenges.set(sessionId, {
      type: "registration",
      challenge: options.challenge,
      userId: user.id,
      createdAt: Date.now(),
      expectedOrigin,
      expectedRPID,
    });
    return { sessionId, options };
  }

  async verifyRegistrationResponse(sessionId: string, response: any) {
    const entry = this.challenges.get(sessionId);
    if (!entry || entry.type !== "registration") {
      throw new UnauthorizedException("Invalid registration session");
    }
    const user = await this.prisma.user.findUnique({
      where: { id: entry.userId! },
    });
    if (!user?.webauthnUserId) throw new UnauthorizedException("User missing");

    const vrOpts: VerifyRegistrationResponseOpts = {
      expectedChallenge: entry.challenge,
      expectedOrigin: entry.expectedOrigin,
      expectedRPID: entry.expectedRPID,
      requireUserVerification: true,
      response,
    };
    const verification = await verifyRegistrationResponse(vrOpts);
    const { verified, registrationInfo } = verification;
    if (!verified || !registrationInfo)
      throw new UnauthorizedException("Registration failed");

    const { credential, aaguid } = registrationInfo;
    const credentialIdB64 = credential.id;
    const publicKeyB64 = this.toBase64Url(Buffer.from(credential.publicKey));
    const counter = credential.counter;

    await this.prisma.webAuthnCredential.create({
      data: {
        userId: user.id,
        credentialId: credentialIdB64,
        publicKey: publicKeyB64,
        counter,
        aaguid: aaguid || null,
      },
    });

    this.challenges.delete(sessionId);
    return { verified, userId: user.id };
  }

  async createAuthenticationOptions(input?: {
    rpID?: string;
    origin?: string;
  }) {
    const expectedRPID = this.rpID(input?.rpID);
    const expectedOrigin = this.origin(input?.origin);
    const opts: GenerateAuthenticationOptionsOpts = {
      rpID: expectedRPID,
      userVerification: "required",
      // For discoverable credentials, keep allowCredentials empty
    };
    const options = await generateAuthenticationOptions(opts);
    const sessionId = this.toBase64Url(randomBytes(16));
    this.challenges.set(sessionId, {
      type: "authentication",
      challenge: options.challenge,
      createdAt: Date.now(),
      expectedOrigin,
      expectedRPID,
    });
    return { sessionId, options };
  }

  async verifyAuthenticationResponse(sessionId: string, response: any) {
    const entry = this.challenges.get(sessionId);
    if (!entry || entry.type !== "authentication") {
      throw new UnauthorizedException("Invalid authentication session");
    }
    const rawId: string | undefined = response?.id;
    if (!rawId) throw new UnauthorizedException("Missing credential id");
    const cred = await this.prisma.webAuthnCredential.findUnique({
      where: { credentialId: rawId },
    });
    if (!cred) throw new UnauthorizedException("Unknown credential");

    const vrOpts: VerifyAuthenticationResponseOpts = {
      expectedChallenge: entry.challenge,
      expectedOrigin: entry.expectedOrigin,
      expectedRPID: entry.expectedRPID,
      requireUserVerification: true,
      response,
      credential: {
        id: cred.credentialId,
        publicKey: new Uint8Array(this.fromBase64Url(cred.publicKey)),
        counter: cred.counter,
      },
    };
    const verification = await verifyAuthenticationResponse(vrOpts);
    const { verified, authenticationInfo } = verification;
    if (!verified || !authenticationInfo)
      throw new UnauthorizedException("Auth failed");

    await this.prisma.webAuthnCredential.update({
      where: { credentialId: cred.credentialId },
      data: { counter: authenticationInfo.newCounter, lastUsedAt: new Date() },
    });
    this.challenges.delete(sessionId);

    return { verified, userId: cred.userId };
  }
}
