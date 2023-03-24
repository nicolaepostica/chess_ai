function init() {
    if (document.run_auto) {
        console.log('MANUAL RESET SERVER')
        fetch('http://localhost:5000/reset', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        })
            .then((response) => response.json())
            .then((data) => {
                console.log('SERVER RESET SUCCESSFULY: ', data);
            })
        console.log('Stop AI')
        clearInterval(document.run_auto)
        document.run_auto = null
    } else {
        var num_to_char = {'1': 'a', '2': 'b', '3': 'c', '4': 'd', '5': 'e', '6': 'f', '7': 'g', '8': 'h'}
        var watch = document.querySelector('.board').classList.contains('flipped') ? 'w' : 'b'
        document.run_auto = setInterval(() => {
            if (document.querySelector('.game-over-modal-content')) {
                console.log('END GAME')
                console.log('AUTO RESET SERVER')
                fetch('http://localhost:5000/reset', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                })
                    .then((response) => response.json())
                    .then((data) => {
                        console.log('SERVER RESET SUCCESSFULY');
                    })
                console.log('Stop AI')
                clearInterval(document.run_auto)
                document.run_auto = null
            } else {
                let highlight = document.querySelectorAll(".highlight")
                if (highlight.length == 0) {
                    fetch('http://localhost:5000/first_move', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    })
                        .then((response) => response.json())
                        .then((data) => {
                            console.log('INIT');
                        })
                } else {
                    let from = highlight[1].classList[1].split('-')[1]
                    let to = highlight[0].classList[1].split('-')[1]
                    if (document.querySelectorAll('.square-' + to).length == 1) {
                        from = highlight[0].classList[1].split('-')[1]
                        to = highlight[1].classList[1].split('-')[1]
                    }

                    let is_watch = document.querySelectorAll('.square-' + to)[1].classList[1][0] == watch

                    if (is_watch) {
                        const data = {
                            move_from: num_to_char[from[0]] + from[1],
                            move_to: num_to_char[to[0]] + to[1],
                            flipped_board: watch == 'w'
                        };
                        fetch('http://localhost:5000/move', {
                            method: 'POST', // or 'PUT'
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify(data),
                        })
                            .then((response) => response.json())
                            .then((data) => {
                                console.log('MOVE:');
                            })
                    }

                }
            }
        }, 1000)
    }
}


chrome.action.onClicked.addListener((tab) => {
    if (tab.url.includes("chess.com")) {
        chrome.scripting.executeScript({
            target: {tabId: tab.id},
            function: init
        });
    }
});