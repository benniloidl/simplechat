function createViewContainer(users){
    console.log("users", users)
    // const container = document.createElement("div");
    // container.classList.add("overview-container");
    const ul = document.createElement("ul");

    for (const user of users) {
        let userObject = generateUsers(user.username);
        ul.appendChild(userObject);
    }

    // container.appendChild(ul);
    // container.appendChild(document.createElement("hr"));
    document.querySelector(".overview-container ul").replaceWith(ul);

}

function generateUsers(username){
    const element = document.createElement("li");
    const user = document.createElement("i");
    const minus = document.createElement("i");

    user.classList.add("fas", "fa-user");
    minus.classList.add("fas", "fa-minus");

    element.appendChild(user);
    element.innerHTML = username;
    element.appendChild(minus);

    return element;

}