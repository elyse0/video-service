const getPreferredFormatForSite = (url: string): string[] => {
    if (url.includes("france.tv")) {
        return ["-f \"(ba+bv)[format_id*=hls]\""]
    }

    return []
}

export {getPreferredFormatForSite}
