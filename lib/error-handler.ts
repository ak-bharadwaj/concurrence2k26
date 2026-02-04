export function getFriendlyError(error: any): string {
    if (!error) return "An unknown error occurred.";

    let code: string | undefined;
    let message: string | undefined;
    let details: string | undefined;

    // 1. Resolve Source and Extract Code/Message
    if (typeof error === 'string') {
        if (error.trim().startsWith('{')) {
            try {
                const parsed = JSON.parse(error);
                return getFriendlyError(parsed);
            } catch (e) { }
        }
        message = error;
    } else if (typeof error === 'object') {
        code = error.code || error.statusCode || error.status;
        message = error.message || error.details || error.hint || error.error_description || error.error;
        details = error.details || error.hint;

        // Deep dive into message if it's a stringified object
        if (typeof message === 'string' && message.trim().startsWith('{')) {
            try {
                const inner = JSON.parse(message);
                if (inner.message) message = inner.message;
                if (inner.code && !code) code = inner.code;
            } catch (e) { }
        }
    }

    // 2. Translate Known Codes
    if (code) {
        const translated = translateCode(String(code), message);
        if (translated) return translated;
    }

    // 3. Handle Common Message Patterns
    if (message) {
        const strMsg = String(message);
        const lowerMsg = strMsg.toLowerCase();

        // CATCH-ALL FOR TECHNICAL LEAKAGE: If it looks like an object even without quotes
        if (strMsg.includes('code:') || strMsg.includes('details:') || strMsg.trim().startsWith('{')) {
            return "Registration error: Please ensure your details are correct (check for duplicate Reg No/Email).";
        }

        if (lowerMsg.includes("invalid team code") || lowerMsg.includes("not found")) return "Invalid Squad Code. Please check and try again.";
        if (lowerMsg.includes("team is full") || lowerMsg.includes("capacity")) return "Oops, looks like you're late! This squad is full now.";
        if (lowerMsg.includes("already registered") || lowerMsg.includes("duplicate")) return "Registration Conflict: This ID or Email is already officially registered.";
        if (lowerMsg.includes("failed to fetch") || lowerMsg.includes("network")) return "Network Issues: Please check your internet connection and try again.";

        return strMsg;
    }

    return "System encounter: Something went wrong. Please try again or contact support.";
}

function translateCode(code: string, rawMessage: string = ""): string {
    const message = (rawMessage || "").toLowerCase();
    switch (code) {
        case "23505":
            if (message.includes("reg_no")) return "This Registration Number is already registered.";
            if (message.includes("email")) return "This Email address is already in use.";
            if (message.includes("phone")) return "This Mobile Number is already in use.";
            if (message.includes("teams_name_key") || message.includes("teams.name")) return "This Squad Name is already taken. Choose another.";
            if (message.includes("transaction_id")) return "This Transaction ID has already been submitted by another user.";
            return "Duplicate Record: One of your details (Email/Phone/Name) is already in use.";
        case "23503":
            return "Data Link Error: The related record was not found in our database.";
        case "42501":
            return "Access Denied: You don't have permission to perform this secure action.";
        case "23502":
            return "Incomplete Profile: Please fill all required fields before syncing.";
        case "P0001":
            return rawMessage || "Validation Protocol Error";
        case "42P01":
            return "System Error: Registration gateway unavailable. Please contact the core team.";
        default:
            return ""; // Fallback to message check in getFriendlyError
    }
}
