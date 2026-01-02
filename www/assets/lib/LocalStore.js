// Ver. 1.0.0

/**
 * localStorageのラッパークラス。
 * (IndexDBと違って、文字列しか保存できない。)
 */
export class LocalStore {
    constructor() {
        ;
    }

    /**
     * キーから設置値を取得する。
     */
    getSettings(key) {
        try {
          const data = localStorage.getItem(key);
          return data ? JSON.parse(data) : null;
        } catch (e) {
          return null;
        }
    }

    /**
     * キーと設定を保存する。
     * @param {*} key 
     * @param {*} settings 
     */
    saveSettings(key, settings) {
        try {
            localStorage.setItem(key, JSON.stringify(settings));

            this.saveLastTime();
        } catch (e) {
            console.warn('保存に失敗しました', e);
        }
    }

    /**
     * キーに対応する設定を削除する。
     * @param {*} key
     */
    removeSettings(key) {
        try {
            localStorage.removeItem(key);
        } catch (e) {
            console.warn('削除に失敗しました', e);
        }
    }

    /**
     * すべての保存値を取得する。
     */
    getAllSettings() {
        const allSettings = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);

            switch(key) {
                case "":
                    // このキーは無視する。
                    break;

                default:
                    if (key) {
                        allSettings[key] = this.getSettings(key);
                    }
                    break;
            }
        }
        return allSettings;
    }
}

