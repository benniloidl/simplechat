/**
 * Read username and password and checks semantic
 * Automatic detection between Registration and Login
 * @returns {{mode: (string), password: *, username: *}|null}
 */
function getValues() {
    let usr = document.getElementById("usr").value.toLowerCase();
    let pwd = document.getElementById("pwd").value;
    let pwdElement = document.getElementById("pwd2");
    let mode = pwdElement ? "register" : "login";
    // further client side checking
    if (usr === "" || pwd === "" || (pwdElement && pwdElement.value === "")) {
        pwdError("Please fill in the missing fields!")
        return null;
    }

    if (!checkUsernameSemantic(usr)) {
        pwdError("Username must only contain upper- and lowercase letters, digits and the special characters \+\-\_\.");
        return null;
    }

    /* Check password semantic,
        because every criterion should match, expression cannot be compressed
     */
    if (
        !(
            pwd.match(/[a-z]/g) &&
            pwd.match(/[A-Z]/g) &&
            pwd.match(/[0-9]/g) &&
            pwd.match(/\W/g) &&
            pwd.length >= 8
        )
    ) {
        pwdError("Password must have at least 8 characters, containing an upper- and lowercase letter, " +
            "digit and a special character");
        return null;
    }

    // compare passwords if register
    if (pwdElement && pwdElement.value !== pwd) {
        pwdError("Passwords doesn't match");
        return null;
    }
    pwdError("username and password semantic ok");
    return {
        username: usr,
        password: pwd,
        mode: mode
    };
}

/**
 * Write Error messages for the login Form
 * @param errorMessage
 */
function pwdError(errorMessage) {
    document.getElementById("pwdError").innerHTML = errorMessage;

}


/**
 * Show or hide error messages in element id: "dashboardError"
 * @param message
 * @param errorId
 */
function showError(message, errorId){
    errorId = (errorId?errorId:"dashboardError");
    // reset error message if message is ""
    // const messagebox = document.getElementById(errorId);
    const messageboxList = document.querySelectorAll(".error");
    for (const messagebox of messageboxList) {
        if (!messagebox) {
            console.error("Error thrown by handling another Error: " +
                "Messagebox to inject message is not defined, " +
                "Errormessage to print: ", message);
            return;
        }
    }
    document.getElementById("dashboardError").innerHTML = message;
    if(message){
        console.warn(message);
    }
}