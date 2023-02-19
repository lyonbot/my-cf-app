export class SubMaker {
  offset: [number, number][] = [];
  subs: string[] = [];
  overlapping: number;

  constructor(overlapping: number = 0) {
    this.overlapping = overlapping * 10 ** 7;
  }

  create_sub(timestamp: [number, number], text: string) {
    this.offset.push([timestamp[0], timestamp[0] + timestamp[1]]);
    this.subs.push(text);
  }

  generate_subs() {
    if (this.subs.length !== this.offset.length) return ''

    let data = "WEBVTT\r\n\r\n";
    for (let i = 0; i < this.subs.length; i++) {
      let sub = unescape(this.subs[i]);
      data += formatter(this.offset[i][0], this.offset[i][1] + this.overlapping, sub);
    }
    return data;
  }
}

function unescape(input: string): string {
  return input.replace(/\\&/g, "&").replace(/\\</g, "<").replace(/\\>/g, ">");
}

function formatter(start: number, end: number, text: string) {
  return `${format_time(start)} --> ${format_time(end)}\r\n${text}\r\n\r\n`;
}

function format_time(time: number) {
  let hours = Math.floor(time / (60 * 60 * 10 ** 7));
  let minutes = Math.floor((time % (60 * 60 * 10 ** 7)) / (60 * 10 ** 7));
  let seconds = Math.floor((time % (60 * 10 ** 7)) / 10 ** 7);
  let milliseconds = time % 10 ** 7;
  return (
    `${hours.toString().padStart(2, "0")}:` +
    `${minutes.toString().padStart(2, "0")}:` +
    `${seconds.toString().padStart(2, "0")}.` +
    `${milliseconds.toString().padStart(7, "0")}`
  );
}
