export function getFriendlyError(error: any): string {
    if (!error) return "An unknown error occurred.";

    // If it's an object with a code (Supabase error)
    if (typeof error === 'object' && error.code) {
        return translateCode(error.code, error.message);
    }

    // Handle string errors that might be stringified JSON
    if (typeof error === 'string') {
        try {
            const parsed = JSON.parse(error);
            if (parsed.code) return translateCode(parsed.code, parsed.message);
        } catch (e) {
            // Not JSON, continue
        }
        return error;
    }

    // Handle standard Error objects
    if (error instanceof Error) {
        const msg = error.message.toLowerCase();
        if (msg.includes("invalid team code")) return "Invalid Team Code. Please check and try again.";
        if (msg.includes("team is full")) return "Squad full: This team already has 5 members.";
        if (msg.includes("failed to fetch") || msg.includes("network")) return "Network error: Please check your internet connection.";
        return error.message;
    }

    return "Something went wrong. Please try again.";
}

function translateCode(code: string, rawMessage: string = ""): string {
    const message = rawMessage.toLowerCase();
    switch (code) {
        case "23505":
            if (message.includes("reg_no")) return "This Registration Number is already registered.";
            if (message.includes("email")) return "This Email address is already in use.";
            return "Entry already exists (Duplicate).";
        case "23503":
            return "Reference error: The related record was not found.";
        case "42501":
            return "Permission denied: You don't have access to perform this action.";
        case "23502":
            return "Incomplete data. Please fill all required fields.";
        default:
            return rawMessage || `Internal Error (${code})`;
    }
}
