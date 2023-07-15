# Bewertungsdokumentation
Simplechat ist ein Messenger, der für die einfache Nutzung geschaffen wurde.

Für SimpleChat wurde ausschließlich HTML, CSS und JavaScript und im Backend zusätzlich NodeJS, Express und MongoDB verwendet.
Die Verbindungen zwischen dem Client und Server erfolgen über HTTP und Websocket.
Chaties sind die Endnutzer, die mit anderen Chaties über unsere Plattform kommunizieren wollen.

## Aufbau der Webseite
Genauere Informationen zur Webseite befinden sich in der Dokumentation.
### Login & Register
Wird die Webseite geladen und es besteht kein gültiger Sessiontoken, wird die Loginseite angezeigt.
Von der Loginseite kann der Chatie in der Fußzeile auf das Impressum und die Datenschutzseite zugreifen.
In der Eingabemaske kann der Chatie auf eine Registrierungsseite zugreifen.

### Dashboard
<img src="image-1.png" alt="Darstellung des Logins" width="300" style="float:right">
Sobald ein Chattie erfolgreich eingeloggt ist, wird dieser auf das Dashboard weitergeleitet.
Der Inhalt wird im Form von Templates nachgeladen und entsprechend eingefügt.
Die jeweiligen personalisierten Daten werden vom Server per Websocket an den Client gesendet und in das Dashboard eingefügt.
Hierbei werden die Daten dynamisch in das Template eingefügt und überscheiben Platzhalter. 

Die Trennung der Daten von der Ansicht ermöglicht es eine andere Applikation über dieselbe Schnittstelle kommunizieren zu lassen.
<img src="image-2.png" alt="Darstellung der Dashboardseite" width="300" style="float:right">
Die Dashboard-Seite ist zweigeteilt. Auf der linken Seite befindet sich eine Navigationsleite und auf der rechten Seite der geladene Inhalt.
Für das responsive Design, wird bei unterschreitung einer bestimmten Bildschirmgröße die Navigationsleiste automatisch eingeklappt und kann über ein entsprechendes Symbol in der Kopfzeile des geladenen Inhalts ausgeklappt werden.
In der Navigationsleiste gibt es drei Abschnitte: Profil, Erstellungsmöglichkeiten und Chats/Gruppen.

Die **Profilansicht** ermöglicht das Ändern des Passwortes, sowie des Löschen des Accounts.
In den **Erstellungsmöglichkeiten** können neue Einzelchats gestartet und Gruppen erstellt werden.
Das Hinzufügen der Gruppenmitlieder erfolgt in den Gruppeneinstellung der jeweiligen Gruppe.
Die **Chatübersicht** bietet ein Überblick über alle Chats und Gruppen.
Bei einem Klick auf den Chat oder Gruppe wird der bisherige Verlauf angezeigt. Hierbei werden die eigenenen Nachrichten auf der rechten Seite hervorgehoben. Unterhalb des Verlaufs befindet sich die Texteingabe zum Versenden neuer Nachrichten.


### Farbschema
Das Farbschema wird automatisch nach den Benutzerpräferenzen geladen.
Das präferierte Farbschema wird im lokalen Speicher zwischengespeichert.
Falls ein Schema nicht zur Verfügung steht, wird automatisch die präferierte Farbgebung mit der Mediaquery geladen.
Sobald sich das Schema der Mediaquery ändert, wird die Farbgebung automatisch angepasst.

### Hovers
Wenn der Mauszeiger über eine Schaltfläche bewegt wird, bekommt der Nutzer ein optisches Feedback

### Fehler
<img src="image-6.png" alt="Connection lost" width="300" style="float:right">
Sobald ein Fehler auftritt, wird dieser jeweils an einer geeigneten Stelle angezeigt.
Falls die Socketverbindung zum Server unterbrochen wird, erscheint ein Overlay, welches über den Disconnect informiert. 
Es wird solange versucht die Seite erneut zu laden, bis die Seite wieder erreichbar ist.

## Dateien
Der Chat unterstützt eine das Anzeigen von Bildern. 
Eine zukünftige Erweiterung zum Anzeigen andere Dateitypen und das versenden von Dateien ist ermöglicht.

## Laden des Chats
Damit das Laden des Chats zügig erfolgt werden jeweils nur eine bestimmte Anzahl an Chats geladen. 
Wenn die Antwort eintrifft, werden weitere Nachrichten nachgeladen und in dem Chat eingefügt. 
Dieses Vorgehen ermöglicht ein schnelleres Laden der letzten Nachrichten.

## Responsive Design
<div style="display: inline-grid; grid-template-columns: 1fr 1fr 1fr; column-gap: 2em   " >
<p>
Um die Seite für Mobilgeräte zu optimieren, passt sich die Seite automatisch der Bildschirmgröße an.
Wird im Dashboard eine gewisse Größe unterschritten, klappt das Seitenmenü ein.
Durch Klicken auf das Burger-Symbol wird diese ausgeklappt und nimmt die gesamte Breite ein.</p>
<img src="image-4.png" alt="Responsive Design Overview" height="300" style="">
<img src="image-5.png" alt="Responsive Design Chat" height="300"style="">
</div>


# Backend
Als Server wird ein Express Server und Websocket verwendet. Um die Cookies zu verarbeiten, wird die Middleware Cookie-Parser genutzt. Ebenfalls wird eine weitere selbstgeschriebene Middleware zur Validierung der Cookies verwendet. Für den Websocket wurde ein eingenes Eventhandling implementier. Über die Events werden dann auch Anfragen an die Datenbank gestellt.

## modernes Javascript
Es werden mehrere Lambda-Expressions verwendet, bspw. werden alle get-Requests mit Lambda-Funktionen behandelt.

## Entwurfsmuster
Die Daten sind auf dem Server von der Ansicht getrennt.
Der Client injected HTML-Templates und erzeugt dynamischen Inhalt über Websockets.


# Anhang

[//]: # (<img src="Loading.PNG" alt="Schematische Darstellung der Dashboardseite" width="" style="float:right">)

[//]: # ()
[//]: # (<img src="Login.PNG" alt="Schematische Darstellung der Dashboardseite" width="" style="float:right">)

[//]: # ()
[//]: # (<img src="Dashboard.PNG" alt="Schematische Darstellung der Dashboardseite" width="" style="float:right">)

## Quellcode
```
<!DOCTYPE html>
<html data-theme="dark" lang="en"><head>
	<meta charset="UTF-8">
	<meta content="width=device-width, initial-scale=1.0" name="viewport">
	<title>SimpleChat</title>
	<link type="image/x-icon" href="../style/logo.png" rel="icon">

	<link href="../style/dashboard.css" rel="stylesheet">
	<link href="../style/general.css" rel="stylesheet">
	<script src="../script/general.js"></script>
	<script defer="" src="../script/socketConnection.js"></script>
	<script src="../script/dashboard.js"></script>

	<script crossorigin="anonymous" src="https://kit.fontawesome.com/6b0af4bcb3.js"></script>

	<script>
		let cleanStorage = () => {
			sessionStorage.clear()
		};
	</script>
</head>

<body>
	<main data-menu-open="false">
		<div id="sidebar">
			<div style="display: flex; flex-direction: row; align-items: center; gap: 8px;">
				<img alt="logo" src="../style/logo.png" width="40" height="40">
				<h1 style="letter-spacing: -1.5px;">SimpleChat</h1>
			</div>
			<i class="fas fa-arrow-right menu-close" onclick="document.querySelector('main').setAttribute('data-menu-open', 'false')" aria-hidden="true"></i>

			<div class="accent-bar"></div>

			<span class="sidebar-callout">Your Profile</span>

			<div class="chat-contact" onclick="injectPageAsync(&quot;../subpages/dashboard/profile.html&quot;, cleanStorage)">
				<i class="fas fa-user" aria-hidden="true"></i>
				<p class="username">emma</p>
			</div>

			<div class="chat-contact appearance" onclick="changeColorScheme()">
				<i class="fas fa-moon" aria-hidden="true"></i>
				<p>Appearance</p>
			</div>

			<div class="chat-contact logout" onclick="logout()">
				<i class="fas fa-sign-out-alt" aria-hidden="true"></i>
				<p>Logout</p>
			</div>

			<div class="accent-bar"></div>

			<span class="sidebar-callout">Get in touch</span>

			<div class="chat-contact" onclick="injectFileWithForm(&quot;../subpages/dashboard/create-chat.html&quot;, newChat, &quot;user&quot;)">
				<i class="fas fa-user-plus" aria-hidden="true"></i>
				<p>New Chat</p>
			</div>

			<div class="chat-contact" onclick="injectFileWithForm(&quot;../subpages/dashboard/create-group.html&quot;, newChat, &quot;group&quot;)">
				<i class="fas fa-pen" aria-hidden="true"></i>
				<p>New Group</p>
			</div>

			<div class="accent-bar"></div>

			<span class="sidebar-callout">Your Chats</span>

			<div id="chats" style="display: flex; flex-direction: column; gap: var(--spacing);"><div data-unread-messages="0" class="chat-contact" data-chat-id="64ae92fcd11332326e653caa" data-chattype="user"><i class="fas fa-user" aria-hidden="true"></i><p>leo</p></div><div data-unread-messages="0" class="chat-contact" data-chat-id="64ae931ed11332326e653cab" data-chattype="group"><i class="fas fa-users" aria-hidden="true"></i><p>Gruppe2</p></div><div data-unread-messages="1" class="chat-contact" data-chat-id="64ae94ccd11332326e653cb3" data-chattype="user"><i class="fas fa-user" aria-hidden="true"></i><p>johanna</p></div></div>
		</div>

		<div id="chat"><div class="chat-contact" onclick="toggleChatOverview(event)">
	<i class="fas fa-user" aria-hidden="true"></i>
	<p id="chat-name">johanna</p>
	<i class="fas fa-bars menu-open" onclick="document.querySelector('main').setAttribute('data-menu-open', 'true')" aria-hidden="true"></i>
	<!--	<p style="position: absolute; right: var(&#45;&#45;spacing); white-space: nowrap; color: red;">-->
	<!--		Delete Chat</p>-->
</div>
<div class="chat-overview-wrapper" data-overview-open="false">
	<div class="overview-container">
		<button onclick="overviewContainerAction()">Leave chat</button>
		<hr>
		<p>Messages: <i id="total-messages">1</i></p>
	</div>
</div>

<div id="chat-box" style="margin-bottom: 0px;"><div class="chat-element chat-element-left" style="order: 11629655;"><p>Hallo emma</p><span class="subtitle">13:56</span></div></div>

<div id="chat-actions">
	<div>
		<label>
			<textarea onfocus="focusTextArea()" onfocusout="document.getElementById('chat-box').style.marginBottom = '0'" placeholder="Enter your message" tabindex="1"></textarea>
		</label>
	</div>

	<div class="chat-actions-button" id="submit-message" tabindex="2">
		<i class="fas fa-paper-plane" aria-hidden="true"></i>
		<span>Send</span>
	</div>
	<input type="file" id="submit-file" accept="image/*" onchange="sendMediaToServerTestMethod()" style="display: none">
</div></div>
	</main>

	<script>
		injectPageAsync("../subpages/dashboard/profile.html", () => {
		});
	</script>
</body></html>
```

<img src="image.png" alt="Seite beschrieben im Anhang" width="400">