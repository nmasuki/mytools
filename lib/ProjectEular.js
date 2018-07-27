/**
 * Created by nmasuki on 9/19/2017.
 */
require('./common/polyfills.js')

function getMultiples(mult, min, max) {
    var multiples = [];
    for (var i = min; (i * mult) < max; i++)
        multiples.push(i * mult);
    return multiples;
}

function fibonaci1(max) {
    for (var fib = [0, 1], i = 0, j = 1, k = 0, x; k < max; i = j, j = x, k++) {
        fib.push(x = i + j);
    }
    return fib;
}

function fibonaci(max) {
    var fib = [0, 1];
    var i = fib.length;
    do {
        // Next fibonacci number = [previous] + [one before previous]
        fib[i] = fib[i - 1] + fib[i - 2];
    } while (fib[i++] < max);
    return fib;
}

function isPrime(num) {
    if (num === 0 || num === 1) {
        return false;
    }
    for (var i = 2; i <= Math.sqrt(num); i++)
        if (num % i === 0)
            return false;

    return true;
}

function getPrimeFactors(value) {
    var p = [];
    var rt = Math.sqrt(value);
    var rem = value;

    label: for (var i = 2; i <= rt; i++) {
        if (isPrime(i))
            while (rem % i == 0) {
                rem = rem / i;
                p.push(i);
                if (isPrime(rem)) {
                    p.push(rem);
                    break label;
                }
            }
    }

    if (p.length)
        return p;
    else if (isPrime(value))
        return [value];
    else
        return [];
}

function isPalindrome(value) {
    var str = value.toString();
    for (var i = 0, j = str.length - 1; i < j; i++, j--)
        if (str[i] !== str[j])
            return false;
    return true;
}

function isPythagoreanTriplet(a, b, c) {
    return c * c == a * a + b * b;
}

module.exports.Eular = module.exports.Euler || {}

module.exports.Eular.problem1 = function multiplesOf3and5(options) {
    options = Object.assign({min: 0, max: 1000}, options);

    var m3 = getMultiples(3, options.min, options.max);
    var m5 = getMultiples(5, options.min, options.max);

    var sum = m3.concat(m5).distinct().sum();
    return sum;
}

module.exports.Eular.problem2 = function fibonaciSum(options) {
    options = Object.assign({max: 4e6}, options);

    var series = fibonaci(options.max).filter(function (i) {
        return i % 2 == 0
    });
    return series.sum();
}

module.exports.Eular.problem3 = function GCD(options) {
    options = Object.assign({value: 600851475143}, options);

    return getPrimeFactors(options.value);
}

module.exports.Eular.problem4 = function largestPalindrome(options) {
    options = Object.assign({value: 9009}, options);

    var larges = 0;
    for (var i = 999; i > 99; i--) {
        for (var j = 999; j > 99; j--) {
            var prod = i * j;
            if (prod > larges && isPalindrome(prod))
                larges = prod;
        }
    }

    return larges;
}

module.exports.Eular.problem5 = function LCM(options) {
    options = Object.assign({max: 20, min: 1}, options);

    var seq = Math.sequence(options.min, options.max).reverse();

    var primeFactors = seq
        .map(getPrimeFactors)
        .filter(function (a) {
            return a.length;
        });

    var groupedPrimes = primeFactors
        .map(function (a) {
            return a.group();
        }).flatten()
        .sort(function (a, b) {
            return b.length - a.length;
        });

    var largerSets = groupedPrimes
        .distinctBy(function (a) {
            return a[0];
        });

    var mult = largerSets.flatten().aggregate(1, (a, b) => a * b);

    return mult;
}

module.exports.Eular.problem6 = function SquareOfSumVSSumOfSquares(options) {
    options = Object.assign({max: 100, min: 1}, options);

    var sum = Math.sequence(options.min, options.max).sum();
    var sqsum = Math.sequence(options.min, options.max, a => a * a).sum();

    return sum * sum - sqsum;
}

module.exports.Eular.problem7 = function NthPrime(options) {
    options = Object.assign({value: 10001}, options);

    var primes = [];
    var i = 0;
    do {
        if (isPrime(++i)) primes.push(i);
    } while (primes.length < options.value)

    return primes[primes.length - 1];
}

module.exports.Eular.problem8 = function LargestProducts(options) {
    options = Object.assign({
        length: 13,
        value: "73167176531330624919225119674426574742355349194934\
96983520312774506326239578318016984801869478851843\
85861560789112949495459501737958331952853208805511\
12540698747158523863050715693290963295227443043557\
66896648950445244523161731856403098711121722383113\
62229893423380308135336276614282806444486645238749\
30358907296290491560440772390713810515859307960866\
70172427121883998797908792274921901699720888093776\
65727333001053367881220235421809751254540594752243\
52584907711670556013604839586446706324415722155397\
53697817977846174064955149290862569321978468622482\
83972241375657056057490261407972968652414535100474\
82166370484403199890008895243450658541227588666881\
16427171479924442928230863465674813919123162824586\
17866458359124566529476545682848912883142607690042\
24219022671055626321111109370544217506941658960408\
07198403850962455444362981230987879927244284909188\
84580156166097919133875499200524063689912560717606\
05886116467109405077541002256983155200055935729725\
71636269561882670428252483600823257530420752963450"
    }, options);

    var arr = options.value.split('');
    var batches = []
    for (var i = 0; i < arr.length - options.length; i++) {
        batches.push(options.value.substr(i, options.length).split('').map(parseFloat));
    }

    var prods = batches.map(a => [a, a.prod()]).sort((a, b) => a[1] - b[1]);

    return prods[prods.length - 1];
}

module.exports.Eular.problem9 = function SpecialPythagoreanTriplet(options) {
    options = Object.assign({sum: 1000}, options);

    var a = 0, b = 0, c = 0, array = [];
    for (a = 0; a <= options.sum; a++) {
        for (b = 0; b <= options.sum; b++) {
            for (c = 0; c <= options.sum; c++) {
                var sum = a + b + c;
                if (sum == options.sum && isPythagoreanTriplet(a, b, c))
                    array.push([a, b, c, [a, b, c].prod()]);
            }
        }
    }

    return array;
}

module.exports.Eular.problem10 = function SummationOfPrimes(options) {
    options = Object.assign({min: 1, max: 2e6}, options);

    var seq = Math.sequence(options.min, options.max).filter(isPrime);

    return seq.sum();
}

module.exports.Eular.problem11 = function SummationOfPrimes(options) {
    options = Object.assign({
        str: `08 02 22 97 38 15 00 40 00 75 04 05 07 78 52 12 50 77 91 08
49 49 99 40 17 81 18 57 60 87 17 40 98 43 69 48 04 56 62 00
81 49 31 73 55 79 14 29 93 71 40 67 53 88 30 03 49 13 36 65
52 70 95 23 04 60 11 42 69 24 68 56 01 32 56 71 37 02 36 91
22 31 16 71 51 67 63 89 41 92 36 54 22 40 40 28 66 33 13 80
24 47 32 60 99 03 45 02 44 75 33 53 78 36 84 20 35 17 12 50
32 98 81 28 64 23 67 10 26 38 40 67 59 54 70 66 18 38 64 70
67 26 20 68 02 62 12 20 95 63 94 39 63 08 40 91 66 49 94 21
24 55 58 05 66 73 99 26 97 17 78 78 96 83 14 88 34 89 63 72
21 36 23 09 75 00 76 44 20 45 35 14 00 61 33 97 34 31 33 95
78 17 53 28 22 75 31 67 15 94 03 80 04 62 16 14 09 53 56 92
16 39 05 42 96 35 31 47 55 58 88 24 00 17 54 24 36 29 85 57
86 56 00 48 35 71 89 07 05 44 44 37 44 60 21 58 51 54 17 58
19 80 81 68 05 94 47 69 28 73 92 13 86 52 17 77 04 89 55 40
04 52 08 83 97 35 99 16 07 97 57 32 16 26 26 79 33 27 98 66
88 36 68 87 57 62 20 72 03 46 33 67 46 55 12 32 63 93 53 69
04 42 16 73 38 25 39 11 24 94 72 18 08 46 29 32 40 62 76 36
20 69 36 41 72 30 23 88 34 62 99 69 82 67 59 85 74 04 36 16
20 73 35 29 78 31 90 01 74 31 49 71 48 86 81 16 23 57 05 54
01 70 54 71 83 51 54 69 16 92 33 48 61 43 52 01 89 19 67 48`
    }, options);

    var set = options.str.split('\n').map(l => l.trim().split(' ').map(n => parseInt(n)));
    var setIndex = Math.sequence(0, 19, i => Math.sequence(0, 19, (j) => [i, j]));

    if (!Array.prototype.val)
        Array.prototype.val = function () {
            if (this.length != 2)
                throw "Error!";
            var i = this[0], j = this[1];

            if (i >= 0 && j >= 0 && set[i])
                return set[i][j];
            return null;
        };

    var right = p => Math.sequence(0, 3, i => [p[0], p[1] + i]);
    var downRight = p => Math.sequence(0, 3, i => [p[0] + i, p[1] + i]);
    var down = p => Math.sequence(0, 3, i => [p[0] + i, p[1]]);
    var downLeft = p => Math.sequence(0, 3, i => [p[0] + i, p[1] - i]);
    var left = p => Math.sequence(0, 3, i => [p[0], p[1] - i]);
    var upLeft = p => Math.sequence(0, 3, i => [p[0] - i, p[1] - i]);
    var up = p => Math.sequence(0, 3, i => [p[0] - i, p[1]]);
    var upRight = p => Math.sequence(0, 3, i => [p[0] - i, p[1] + i]);

    var fn = p => [right(p), downRight(p), down(p), downLeft(p)];

    var a = setIndex.map(fn).flatten(),
        b = a.map(i => i.val()),
        c = b.map(i => i.prod()),
        d = c.max();

    return d;
}

var keys = Object.keys(module.exports.Eular);
module.exports.Eular.last = module.exports.Eular.latest = module.exports.Eular[keys.pop()];