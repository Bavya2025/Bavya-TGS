/**
 * Encodes a string ID to URL-safe Base64.
 * Use this for IDs in URLs (path or query params).
 */
export const encodeId = (id) => {
    if (!id) return '';
    try {
        const base64 = btoa(id.toString());
        return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    } catch (e) {
        console.error("Error encoding ID:", id, e);
        return id;
    }
};

/**
 * Decodes a URL-safe Base64 encoded ID.
 * Use this if you receive an encoded ID and need the original.
 */
export const decodeId = (encodedId) => {
    if (!encodedId) return '';
    try {
        let base64 = encodedId.replace(/-/g, '+').replace(/_/g, '/');
        while (base64.length % 4) {
            base64 += '=';
        }
        return atob(base64);
    } catch (e) {
        console.error("Error decoding ID:", encodedId, e);
        return encodedId;
    }
};
