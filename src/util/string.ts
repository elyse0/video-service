const getNormalizedString = (text: string): string => {

    return text
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .replace(/\n/g, '')
}

export {getNormalizedString}
