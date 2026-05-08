function createUuidFromRandomValues() {
    const cryptoApi = globalThis.crypto

    if (!cryptoApi?.getRandomValues) {
        return null
    }

    const bytes = cryptoApi.getRandomValues(new Uint8Array(16))

    bytes[6] = (bytes[6] & 0x0f) | 0x40
    bytes[8] = (bytes[8] & 0x3f) | 0x80

    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')

    return [
        hex.slice(0, 8),
        hex.slice(8, 12),
        hex.slice(12, 16),
        hex.slice(16, 20),
        hex.slice(20),
    ].join('-')
}

function createUuidFromMathRandom() {
    const template = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'

    return template.replace(/[xy]/g, (character) => {
        const random = Math.floor(Math.random() * 16)
        const value = character === 'x' ? random : (random & 0x3) | 0x8

        return value.toString(16)
    })
}

export function createUuid() {
    if (globalThis.crypto?.randomUUID) {
        return globalThis.crypto.randomUUID()
    }

    return createUuidFromRandomValues() ?? createUuidFromMathRandom()
}
