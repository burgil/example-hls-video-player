export function parseTime(seconds: number): string {
    let roundMinutes: number | string = Math.floor(seconds / 60);
    let secondsLeft: number | string = seconds - (roundMinutes * 60);
    if (secondsLeft < 10) secondsLeft = `0${secondsLeft}`;
    if (roundMinutes < 10) roundMinutes = `0${roundMinutes}`;
    return `${roundMinutes}:${secondsLeft}`;
}