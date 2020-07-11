function extractMillis(timeElement) {
    var digits = timeElement.find('.digit').text().split('').map(digit => parseInt(digit))
    // console.log('digits=%o for %o', digits, timeElement)
    return 1000 * (60 * digits[0] + 10 * digits[1] + digits[2])
}

function getCountdownMillis() {
    $('.plan .time.running').removeClass('running')
    var timeElement = $('.plan .apnea.running .time').eq(0);
    timeElement.addClass('running')
    return extractMillis(timeElement)
}

function getStopwatchMillis() {
    $('.plan .time.running').removeClass('running')
    var timeElement = $('.plan .apnea.running .time').eq(1);
    timeElement.addClass('running')
    return extractMillis(timeElement)
}

function clearTimer() {
    console.log('CLEAR')
    timer && clearInterval(timer)
    $('.btn.btn-start').show()
    $('.btn.btn-continue').hide()
    $('.btn.btn-pause').hide()
    $('.btn.btn-clear').hide()
    $('.controls').show()

    $('.plan .running').removeClass('running')
    $('.plan .selected').removeClass('selected')
    $('.plan .apnea').eq(0).addClass('selected')
    $('.plan .digit').eq(0).addClass('selected')
}

function setParamsAndStartTimer() {
    timerFunction = countdownTick
    passedMillis = 0
    remainingMillis = getCountdownMillis()
    nextAudioIdx = audios.length - 1
    while (nextAudioIdx >= 0 && audios[nextAudioIdx].millis > remainingMillis) nextAudioIdx--
    continueTimer()
}

function startTimer() {
    console.log('START')
    $('.plan .apnea').eq(0).addClass('running')
    $('.plan .selected').removeClass('selected')
    setParamsAndStartTimer();
}

function continueTimer() {
    startedMillis = new Date().getTime()
    endMillis = startedMillis + remainingMillis
    console.log('CONTINUE for '+(endMillis-startedMillis))
    timer = setInterval(timerFunction, 100)
    $('.btn.btn-start').hide()
    $('.btn.btn-continue').hide()
    $('.btn.btn-pause').show()
    $('.btn.btn-clear').show()
}

function pauseTimer() {
    console.log('PAUSE')
    clearInterval(timer)
    var nowMillis = new Date().getTime()
    passedMillis += nowMillis - startedMillis
    remainingMillis -= nowMillis - startedMillis
    $('.btn.btn-start').hide()
    $('.btn.btn-continue').show()
    $('.btn.btn-pause').hide()
    $('.btn.btn-clear').show()
}

function digs(num) {
    num = num % 100
    return num > 9? num.toString(): '0'+num
}

function formatMillis(ms) {
    var mm = Math.trunc(ms / (1000 * 60))
    var ss = Math.trunc(ms % (1000 * 60) / 1000)
    var ts = Math.trunc(ms % 1000 / 100)
    return digs(mm) + ':' + digs(ss) + '.' + ts
}

function countdownTick() {
    var nowMillis = new Date().getTime()
    if (nowMillis > endMillis) {
        clearInterval(timer)
        console.log('COUNTDOWN -> STOPWATCH')
        timerFunction = stopwatchTick
        passedMillis = 0
        remainingMillis = getStopwatchMillis()
        continueTimer()
    } else {
        var publishMillis = endMillis - nowMillis;
        $('#timer').text(formatMillis(publishMillis))
        if (nextAudioIdx >= 0 && publishMillis < audios[nextAudioIdx].millis) {
            audios[nextAudioIdx--].audio.play()
        }
    }
}

function stopwatchTick() {
    var nowMillis = new Date().getTime()
    if (nowMillis > endMillis) {
        clearInterval(timer)
        console.log('END')

        var nextRow = $('.plan .apnea.running').next('.apnea')
        $('.plan .apnea.running').removeClass('running')

        if (nextRow.length) {
            nextRow.addClass('running')
            setParamsAndStartTimer()
        } else {
            $('.btn.btn-start').hide()
            $('.btn.btn-continue').hide()
            $('.btn.btn-pause').hide()
            $('.btn.btn-clear').show()
        }
    } else {
        $('#timer').text(formatMillis(passedMillis + nowMillis - startedMillis))
    }
}

function selectDigit(nextDigitFn) {
    var allDigits = $('.plan .digit')
    var digit = $('.plan .digit.selected')
    var nextDigit = nextDigitFn(allDigits, digit)
    if (nextDigit.length) {
        digit.removeClass('selected')
        nextDigit.addClass('selected')
        digit.closest('.apnea').removeClass('selected')
        nextDigit.closest('.apnea').addClass('selected')
    }
}

function parseKey(event) {
    var keycode = event.keyCode || event.which
    var keychar = String.fromCharCode(keycode)
    // console.log('keycode=%d, keychar="%s"', keycode, keychar)
    if (keychar === ' ') {
        $('.controls .btn-default:visible').click()
    } else if (keychar.toLowerCase() === 'c') {
        $('.btn-clear:visible').click()
    } else if (keychar >= '0' && keychar <= '9') {
        selectDigit((allDigits, digit) => {
            digit.text(keychar)
            return allDigits.eq(allDigits.index(digit) + 1)
        })
    }
}

function parseArrowKey(event) {
    switch (event.key) {
        case "ArrowLeft":
            selectDigit((allDigits, digit) => allDigits.eq(allDigits.index(digit) - 1))
            break;
        case "ArrowRight":
            selectDigit((allDigits, digit) => allDigits.eq(allDigits.index(digit) + 1))
            break;
        case "ArrowUp":
            selectDigit((allDigits, digit) => {
                var digitIndex = digit.closest('.apnea').find('.digit').index(digit)
                return digit.closest('.apnea').prev('.apnea').find('.digit').eq(digitIndex)
            })
            break;
        case "ArrowDown":
            selectDigit((allDigits, digit) => {
                let thisRow = digit.closest('.apnea');
                let digitIndex = thisRow.find('.digit').index(digit)
                let nextRow = thisRow.next('.apnea');
                if (!nextRow.length) {
                    nextRow = thisRow.clone(true)
                    nextRow.insertAfter(thisRow)
                }
                return nextRow.find('.digit').eq(digitIndex)
            })
            break;
        case "Home":
            selectDigit((allDigits, digit) => allDigits.eq(0))
            break;
        case "End":
            selectDigit((allDigits, digit) => allDigits.eq(allDigits.length - 1))
            break;
        case "Delete":
        case "Backspace":
            let thisRow = $('.plan .apnea.selected')
            let nextRow = thisRow.next('.apnea');
            if (nextRow.length) {
                thisRow.remove()
                nextRow.addClass('selected')
                nextRow.find('.digit').eq(0).addClass('selected')
            }
            break;
    }
}

var audios

function prepareAudio() {
    audios = []
    $('audio').each((idx, audio) => {
        var digits = audio.id.substr(5).split('').map(digit => parseInt(digit))
        var millis = 1000 * (60 * (10 * digits[0] + digits[1]) + 10 * digits[2] + digits[3])
        audios.push({millis, audio})
        audio.load()
    })
}

var startedMillis
var endMillis
var passedMillis
var remainingMillis
var timer
var timerFunction
var nextAudioIdx

$(() => {
    $('.btn-start').click(startTimer)
    $('.btn-continue').click(continueTimer)
    $('.btn-pause').click(pauseTimer)
    $('.btn-clear').click(clearTimer)
    $(document).keypress(parseKey)
    $(document).keydown(parseArrowKey)

    prepareAudio()
    clearTimer()
})
