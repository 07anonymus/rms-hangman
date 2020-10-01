const idb = new Idb();
(async function () {

	const req = idb.open('rms-hangman', 1, function (e) {
		idb.createTable('packs', { keyPath: 'name', autoIncrement: false, unique: true });
		idb.createTable('store', { keyPath: 'name', autoIncrement: false, unique: true });
		idb.createTable('bank', { keyPath: 'id', autoIncrement: true, unique: true });
	})

	req.onsuccess = async function (e) {
		idb.db = e.target.result;

		const hasDataPacksTable = await hasData('packs');
		if (!hasDataPacksTable) {
			initPacks();
		}

		const hasDataStoreTable = await hasData('store');
		if (!hasDataStoreTable) {
			initStore();
		}

		const hasDataBankTable = await hasData('bank');

		if (!hasDataBankTable) {
			await initBank();
		}

		checkStore();
	}

	async function handleEvent() {
		const pack = this.alt;
		if (pack == 'store') {
			window.location = 'store.html';
			return;
		};

		const cant = await readStore(pack);
		if (!cant) {
			this.className = 'disabled';
			showAlert(pack);
		} else {
			// this validation is to check if guessing word is in progress,
			// if response is false means shorcut is completed;
			if (applyShorcut(pack) == false) return; 
			await updateStore(pack, 1, '-');
			const updatedCant = await readStore(pack);
			if (!updatedCant) {
				this.className = 'disabled';
			}

		}
	}
	

	function showAlert(pack) {
		console.log(`No hay ${pack} disponibles`);

	}

	async function checkStore() {
		const packs = idb.readAll('store');
		packs.onsuccess = function (e) {
			result = e.target.result;
			result.map(pack => {
				if (pack.cant == 0) {
					const elem = document.querySelector(`img[alt=${pack.name}`);
					elem.className = 'disabled';
				}
			})
		}
	}

	function findButton(key) {
		const buttons = document.querySelectorAll('button');
		return new Promise((resolve, reject) => {
			buttons.forEach(function (btn) {
				if (btn.textContent == key.toUpperCase()) {
					resolve(btn);
				}
			})
		})
	}

	const itemsAvatar = document.querySelectorAll('img');
	itemsAvatar.forEach(item => item.addEventListener('click', handleEvent, false));




	const guessesBtnParent = document.getElementById('guesses-container');
	const answerBntParent = document.getElementById('answer');
	var wordList = await loadDB('./assets/database.json');
	var guesses = [];
	const maxLives = 6;
	var targetWord = '';


	function renderGuessesBtn(val) {
		const props = { class: 'filled', textContent: val.toUpperCase() };
		const btn = newElement('button', props);
		btn.addEventListener('click', update, false);
		guessesBtnParent.appendChild(btn);
	}

	async function toggleBtnState(e) {
		if (e.type == 'click') {
			this.className = 'empty';
			this.disabled = true;
			return;
		}
		const button = await findButton(e.key);
		button.className = 'empty';
		button.disabled = true;
	}

	async function loadDB(path) {
		const response = await fetch(path);
		return await response.json();
	}

	function readLevel() {
		return localStorage.getItem('level');
	}

	function initLevel() {
		localStorage.setItem('level', 1);
	}

	function saveItem(itemName, itemValue) {
		localStorage.setItem(itemName, itemValue);
	}

	function getItem(itemName) {
		return localStorage.getItem(itemName);
	}

	function updateLevel() {
		const oldlevel = readLevel();

		!oldlevel ? saveItem('level', 1) : null ;

		if (parseInt(oldlevel) > wordList.length) return;
		saveItem('level', parseInt(oldlevel) + 1);
		saveItem('guesses', '');
	}

	function fetchWord() {
		if (readLevel() - 1 < wordList.length) {
			return targetWord = wordList[readLevel() -1];
		}
		return false;
	}

	function hideWord() {
		answerBntParent.innerHTML = '';
		var hiddenWord = '';
		guesses = getItem('guesses').split('');

		targetWord.split('').map(letter => {
			if (!guesses.includes(letter.toLowerCase())) {
				hiddenWord += '-';
				const props = {class: 'empty', textContent: '0'};
				const btn = newElement('button', props);
				answerBntParent.appendChild(btn);
			} else {
				hiddenWord += letter;
				const props = { class: 'filled', textContent: letter };
				const btn = newElement('button', props);
				answerBntParent.appendChild(btn);
			}
		})

		guesses.forEach(disableMatchButton);
		
		return hiddenWord;
	}

	function disableMatchButton(key) {
		const buttons = document.querySelectorAll('#guesses-container button.filled');
		console.log(key)
		buttons.forEach(function (btn) {

			if (btn.textContent == key.toUpperCase()) {
				btn.disabled = true;
				btn.className = 'empty';
			}

		})
	}

	function storeGuess(key) {
		if (/^[a-zA-Z]$/.test(key)) {
			// console.log(key);
			
			if (!guesses.includes(key.toLowerCase())) {
				guesses.push(key.toLowerCase());
				saveItem('guesses', getItem('guesses') + key.toLowerCase());
				return false;
			}
			return true;
		}
	}

	function reviewLives() {
		var remainingLives = maxLives;
		var str = targetWord.toLowerCase();
		const liveHtm = document.getElementById('remaining-lives');
		guesses = getItem('guesses').split('')
		guesses.filter(function (val) {
			if (!str.includes(val)) {
				remainingLives--;	
				liveHtm.textContent = remainingLives;
			}
		})

		if (remainingLives <= 0) {
			saveTimer();
			setTimeout(function () {
				showMessage("level-fail");
				toggleKeyupListener();
				renderTimer();
				const intervalId = setInterval(async () => {
					renderTimer();
					await isTimerEnd(intervalId)
					resetGame();
					toggleKeyupListener();
				},1000)
			},10)
		}
	}

	function checkIfWon() {
		if (targetWord == hideWord()) {
			setTimeout(function () {
				// alert('You won');
				showMessage("level-success");
				toggleKeyupListener()
				updateLevel();
				setTimeout(() => {
					hideMessage()
					toggleKeyupListener()
					resetGame()
				}, 2000);
			},200)
		}
	}

	function resetGame() {
		const parent = document.getElementById('guesses-container');
		parent.innerHTML = '';
		saveItem('guesses', '');
		guesses = [];
		targetWord = '';
		main();
	}

	function update(e) {
		toggleBtnState(e);
		const isKeyStored = storeGuess(e.key || e.target.textContent);
		console.log(hideWord());
		if (!isKeyStored) {
			reviewLives();
			console.log(hideWord())
		}
		checkIfWon();
	}

	function main() {
		if (!getItem('guesses')) {
			saveItem('guesses', '')
		}
		if (!readLevel()) {
			initLevel();
		}
		if (!fetchWord()) {
			showMessage('end-game');
		}


		const liveHtm = document.getElementById('remaining-lives');		
		const levelHtm = document.getElementById('current-level');
		levelHtm.textContent = readLevel();
		liveHtm.textContent = maxLives;
		const abc = 'abcdefghijklmnñopqrstuvwxyz'.split('');
		abc.forEach(renderGuessesBtn);
		console.log(targetWord);
		console.log(hideWord());
		reviewLives();
		
	}
	
	document.addEventListener('keyup', update, false);

	function toggleKeyupListener() {
		if (document.querySelector('#lock-layout').className == "lock-layout locked") {
			document.removeEventListener('keyup', update, false);
		} else {
			document.addEventListener('keyup', update, false);
		}
	}

	main()
})()