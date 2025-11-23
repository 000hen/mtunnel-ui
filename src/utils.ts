export const wait = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

export const isPortValid = (port: number) => port >= 1 && port <= 65535;