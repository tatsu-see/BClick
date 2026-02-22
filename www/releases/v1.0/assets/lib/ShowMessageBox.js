// Ver. 1.0.0

/**
 * メッセージBoxを数秒表示する。
 * メモをクリップボードにコピーしたメッセージを出力する。
 // 時間が未設定の場合は、0.8秒表示する。
 */
export function showMessage( messageBoxID, showTime = 800 ) {
    const messageBox = document.getElementById( messageBoxID );
    messageBox.style.display = "block";

    setTimeout(() => {
        messageBox.style.display = "none";
    }, showTime); // 指定秒後に消える
}

/**
 * ユーザに Yes/No/Calcel 確認ダイアログを表示する。
 */
export class ConfirmDialog {
    constructor() {
        this.dialog = document.getElementById("confirmDialog");
    }

    /**
     * メッセージを表示して、ユーザの操作を待つ。
     * @param {*} messageDiv 
     * @returns 
     */
    #show(messageDiv, focusID) {
        console.log("ConfirmDialog::show");

        // メッセージを取得する。
        const div = document.getElementById(messageDiv);

        return new Promise((resolve) => {
            console.log("ConfirmDialog::show::Promise");

            // ダイアログメッセージを表示する。
            this.dialog.querySelector('#dialog-message').innerHTML = div.innerHTML;

            this.dialog.addEventListener('close', () => {
                resolve(this.dialog.returnValue);
            }, { once: true });

            console.log("ConfirmDialog::show::Promise::showModal");

            // DOMが構築される前に showModal() を呼ぶと、正しく処理されない。
            // setTimeout() を使って、DOMの構築が完了した後に showModal() を呼ぶ。
            setTimeout(() => {
            if (!this.dialog.open) {
                this.dialog.showModal();

                // ボタンのデフォルトが決まっていたら、そこにfocusする。
                if (focusID) {
                    const focusElement = document.getElementById( focusID );
                    if (focusElement) {
                        focusElement.focus();
                    }
                }
            }
            }, 0);
        });
    }

    /**
     * メッセージを表示して、ユーザの操作を待つ。
     * @param {*} messageDiv 
     * @returns 
     */
    async showAndExecute(messageDiv, onYes, onNo, focusID) {
        console.log("ConfirmDialog::showAndExecute");

        const result = await this.#show(messageDiv, focusID);
        if (result ==='yes') {
            onYes?.();
        }
        else if (result === 'no') {
            onNo?.();
        }
    }
}

/**
 * ユーザに OK ボタンを押すまで表示する ダイアログを表示する。
 */
export class MessageDialog {
    constructor() {
        this.dialog = document.getElementById("messageDialog");
    }

    /**
     * メッセージを表示して、ユーザの操作を待つ。
     * @param {*} messageDiv 
     * @returns 
     */
    #show(messageDiv, focusID) {
        console.log("MessageDialog::show");

        // メッセージを取得する。
        const div = document.getElementById(messageDiv);

        return new Promise((resolve) => {
            console.log("MessageDialog::show::Promise");

            // ダイアログメッセージを表示する。
            this.dialog.querySelector('#dialog-message').innerHTML = div.innerHTML;

            this.dialog.addEventListener(
                'close', () => {
                    resolve(this.dialog.returnValue);
                }, { once: true }
            );

            console.log("MessageDialog::show::Promise::showModal");

            // DOMが構築される前に showModal() を呼ぶと、正しく処理されない。
            // setTimeout() を使って、DOMの構築が完了した後に showModal() を呼ぶ。
            setTimeout(() => {
                if (!this.dialog.open) {

                    // showModal の前に初期値を設定する


                    this.dialog.showModal();

                    // ボタンのデフォルトが決まっていたら、そこにfocusする。
                    if (focusID) {
                        const focusElement = document.getElementById( focusID );
                        if (focusElement) {
                            focusElement.focus();
                        }
                    }
                }
                }, 0
            );
        });
    }

    /**
     * メッセージを表示して、ユーザの操作を待つ。
     * @param {*} messageDiv 
     * @returns 
     */
    async showAndExecute(messageDiv, onOk, focusID) {
        console.log("MessageDialog::showAndExecute");

        const result = await this.#show(messageDiv, focusID);
        if (result ==='ok') {
            onOk?.(this.dateTimeInput?.value);
        }
    }
}

/**
 * ユーザに 日時設定 ダイアログを表示する。
 */
export class DateTimeDialog {
    constructor() {
        this.dialog = document.getElementById("dateTimeEntry");
        this.dateTimeInput = document.getElementById("reminderDateTime");
        this.intervalInput = document.getElementById("reminderInterval");
        this.jsRunningMode = document.getElementById("jsRunningMode");
    }

    /**
     * メッセージを表示して、ユーザの操作を待つ。
     * @param {*} messageDiv 
     * @returns 
     */
    #show(initDateTime, initInterval, initJsRunning, focusID) {
        console.log("DateTimeDialog::show");

        return new Promise((resolve) => {
            console.log("DateTimeDialog::show::Promise");

            this.dialog.addEventListener(
                'close', () => {
                    resolve(this.dialog.returnValue);
                }, { once: true }
            );

            console.log("DateTimeDialog::show::Promise::showModal");

            // DOMが構築される前に showModal() を呼ぶと、正しく処理されない。
            // setTimeout() を使って、DOMの構築が完了した後に showModal() を呼ぶ。
            setTimeout(() => {
                if (!this.dialog.open) {

                    // showModal の前に初期値を設定する
                    if (this.dateTimeInput) {

                        // 初期値の指定があればその日時、なければ現在日時を設定する。
                        let now = new Date();
                        if( initDateTime ) {
                           now = new Date(initDateTime); 
                        }

                        // 初期値のインターバル、なければ null を設定する。
                        let interval = null;
                        if( initInterval ) {
                            interval = new Date(initInterval);
                        }

                        // 初期値の JS実行モード、なければ false を設定する。
                        let jsRunning = false;
                        if( initJsRunning ) {
                            jsRunning = initJsRunning;
                        }

                        // datetime-local は "YYYY-MM-DDTHH:MM" 形式
                        const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
                                         .toISOString().slice(0,16);

                        let inter = null;
                        
                        if( interval != null ) {
                            inter = new Date(interval.getTime() - interval.getTimezoneOffset() * 60000)
                                         .toISOString().slice(0,16);
                        }

                        this.dateTimeInput.value = local;
                        this.intervalInput.value = inter;
                        this.jsRunningMode.checked = jsRunning;
                    }

                    this.dialog.showModal();

                    // ボタンのデフォルトが決まっていたら、そこにfocusする。
                    if (focusID) {
                        const focusElement = document.getElementById( focusID );
                        if (focusElement) {
                            focusElement.focus();
                        }
                    }
                }
                }, 0
            );
        });
    }

    /**
     * メッセージを表示して、ユーザの操作を待つ。
     * @param {*} messageDiv 
     * @returns 
     */
    async showAndExecute(initDateTime, initInterval, initJsRunning, onOk, onClear, onCancel, focusID) {
        console.log("DateTimeDialog::showAndExecute");

        const result = await this.#show(initDateTime, initInterval, initJsRunning, focusID);

        if (result ==='ok') {
            onOk?.(this.dateTimeInput?.value, this.intervalInput?.value, this.jsRunningMode?.checked);
        }
        else if (result === 'clear') {
            onClear?.();
        }
        else if (result === 'cancel') {
            onCancel?.();
        }
    }
}