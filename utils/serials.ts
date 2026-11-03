// Serial numbers are stored upper-case and trimmed so "ab12" and "AB12 " match.
export function normalizeSerials(raw: unknown): { serials: string[]; error?: string } {
    if (raw === undefined || raw === null || raw === "") return { serials: [] };
    if (!Array.isArray(raw)) return { serials: [], error: "Serial numbers must be a list." };
    if (raw.length > 500) return { serials: [], error: "Too many serial numbers at once (max 500)." };

    const seen = new Set<string>();
    const serials: string[] = [];

    for (const entry of raw) {
        const value = String(entry ?? "").trim().toUpperCase();
        if (!value) continue;
        if (value.length > 64) {
            return { serials: [], error: `Serial number "${value.slice(0, 20)}..." is too long (max 64 characters).` };
        }
        if (seen.has(value)) {
            return { serials: [], error: `Serial number ${value} is entered more than once.` };
        }
        seen.add(value);
        serials.push(value);
    }

    return { serials };
}
