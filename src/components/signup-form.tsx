"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldError,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { checkNameAvailability, registerNewUser } from "@/lib/actions/auth";
import { useLocalStorage } from "usehooks-ts";
import { User } from "@/lib/db/schema";

// Helper function to normalize spaces
function normalizeSpaces(str: string): string {
  return str.replace(/\s+/g, " ");
}

// Helper function to validate name format
function validateNameFormat(name: string): string | null {
  const trimmed = name.trim();
  const normalized = normalizeSpaces(trimmed);

  if (normalized.length === 0) {
    return "Name is required";
  }

  if (normalized.length < 3) {
    return "Name must be at least 3 characters long";
  }

  if (normalized.length > 20) {
    return "Name must not exceed 20 characters";
  }

  // Check if name contains only alphanumeric characters and spaces
  if (!/^[a-zA-Z0-9\s]+$/.test(normalized)) {
    return "Name can only contain letters, numbers, and spaces";
  }

  return null;
}

const storageOptions = {
  initializeWithValue: false,
};

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isCheckingName, setIsCheckingName] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isNameAvailable, setIsNameAvailable] = useState(false);
  const [, setAuthToken] = useLocalStorage("authToken", "", storageOptions);
  const [, setUser] = useLocalStorage<User | null>(
    "user",
    null,
    storageOptions
  );
  const [, setAuthCreatedAt] = useLocalStorage<string | null>(
    "authCreatedAt",
    null,
    storageOptions
  );

  // Debounced name availability check
  useEffect(() => {
    const validateAndCheckName = async () => {
      const trimmed = name.trim();
      const normalized = normalizeSpaces(trimmed);

      // First check local validation
      const validationError = validateNameFormat(name);
      if (validationError) {
        setError(validationError);
        setIsNameAvailable(false);
        return;
      }

      // If local validation passes, check if name exists
      setIsCheckingName(true);
      setError(null);

      try {
        const result = await checkNameAvailability(normalized);

        if (result.error) {
          setError(result.error);
          setIsNameAvailable(false);
        } else if (result.exists) {
          setError("This name is already taken. Please choose another one.");
          setIsNameAvailable(false);
        } else {
          setError(null);
          setIsNameAvailable(true);
        }
      } catch {
        setError("Failed to check name availability. Please try again.");
        setIsNameAvailable(false);
      } finally {
        setIsCheckingName(false);
      }
    };

    if (name) {
      const timeoutId = setTimeout(validateAndCheckName, 500);
      return () => clearTimeout(timeoutId);
    } else {
      setError(null);
      setIsNameAvailable(false);
    }
  }, [name]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isNameAvailable || isCheckingName) {
      return;
    }

    setIsSubmitting(true);

    try {
      const trimmed = name.trim();
      const normalized = normalizeSpaces(trimmed);

      const result = await registerNewUser(normalized);

      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.success && result.token && result.user) {
        // Save to localStorage
        setAuthToken(result.token);
        setUser(result.user);
        setAuthCreatedAt(result.createdAt);

        // Redirect to home page
        router.push("/");
      }
    } catch {
      setError("Failed to create account. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isButtonDisabled = !isNameAvailable || isCheckingName || isSubmitting;

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <form onSubmit={handleSubmit}>
        <FieldGroup>
          <div className="flex flex-col items-center gap-2 text-center">
            <Link
              href="/"
              className="flex flex-col items-center gap-2 font-medium"
            >
              <div className="flex size-16 items-center justify-center rounded-md">
                <Image
                  src="/icon.png"
                  alt="Snake Game Logo"
                  width={64}
                  height={64}
                  priority
                />
              </div>
            </Link>
            <h1 className="text-xl font-bold">Welcome to Snake Game!</h1>
            <FieldDescription>
              Enter your name to start playing and compete with others
            </FieldDescription>
          </div>
          <Field>
            <FieldLabel htmlFor="name">Name</FieldLabel>
            <Input
              id="name"
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={isSubmitting}
              aria-invalid={error ? "true" : "false"}
            />
            {error && <FieldError>{error}</FieldError>}
            {isCheckingName && (
              <FieldDescription>Checking availability...</FieldDescription>
            )}
            {isNameAvailable && !isCheckingName && (
              <FieldDescription className="text-green-600">
                Name is available!
              </FieldDescription>
            )}
          </Field>
          <Field>
            <Button type="submit" disabled={isButtonDisabled}>
              {isSubmitting ? "Creating..." : "Start Playing"}
            </Button>
          </Field>
        </FieldGroup>
      </form>
    </div>
  );
}
