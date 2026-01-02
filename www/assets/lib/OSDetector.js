// Ver. 1.0.0

export class OSDetector {

    constructor() {
        this.userAgent = navigator.userAgent || navigator.vendor || window.opera;
    }

    getOS() {
        const ua = this.userAgent;

        if (/windows phone/i.test(ua)) {
            return "Windows Phone";
        }
        if (/win/i.test(ua)) {
            return "Windows";
        }
        if (/android/i.test(ua)) {
            return "Android";
        }
        if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) {
            return "iOS";
        }
        if (/Macintosh|MacIntel|MacPPC|Mac68K/.test(ua)) {
            return "macOS";
        }
        if (/Linux/.test(ua)) {
            return "Linux";
        }

        return "Unknown";
    }

    /**
     * Macか？
     * @returns 
     */
    isMac() {
        const os = this.getOS();
        return os === "macOS";
  }
}
