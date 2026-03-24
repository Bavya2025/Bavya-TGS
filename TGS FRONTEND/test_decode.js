import axios from 'axios';
import { decodeId } from './src/utils/idEncoder.js';

const encodedId = 'SVRTLVBST0otMTA0LVZJSi1tYXIyNi0wNQ';
const decodedId = decodeId(encodedId);

console.log("Encoded ID:", encodedId);
console.log("Decoded ID:", decodedId);

// Since we cannot easily import absolute backends without creds, let's just make sure decode works.
// Wait, we can curl to 192.168.1.135:8000 or whatever the backend is to test endpoint layout directly!
// But we don't have token.
console.log("Check complete.");
