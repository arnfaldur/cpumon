const fs = require('fs');
const blessed = require('blessed');

// Function to parse /proc/cpuinfo and extract CPU MHz for all cores
function getCpuInfo() {
    const cpuInfo = fs.readFileSync('/proc/cpuinfo', 'utf8');
    const cores = [];
    const lines = cpuInfo.split('\n');
    let coreIndex = -1;

    lines.forEach(line => {
        if (line.startsWith('processor')) {
            coreIndex++;
        } else if (line.startsWith('cpu MHz')) {
            const mhz = parseFloat(line.split(':')[1].trim());
            cores[coreIndex] = mhz;
        }
    });

    return cores;
}
// Function to interpolate between two colors
function interpolateColor(color1, color2, t) {
    const r = Math.round(color1[0] + (color2[0] - color1[0]) * t);
    const g = Math.round(color1[1] + (color2[1] - color1[1]) * t);
    const b = Math.round(color1[2] + (color2[2] - color1[2]) * t);
    return [r, g, b];
}

// Function to map MHz to gradient
function getGradientColor(mhz, minMhz, maxMhz) {
    const colors = [
        [198, 255, 221], // #c6ffdd
        [251, 215, 134], // #fbd786
        [247, 121, 125]  // #f7797d
    ];

    const normalized = (mhz - minMhz) / (maxMhz - minMhz);
    let color;

    if (normalized <= 0.5) {
        color = interpolateColor(colors[0], colors[1], normalized * 2);
    } else {
        color = interpolateColor(colors[1], colors[2], (normalized - 0.5) * 2);
    }

    return color;
}

// Function to create cell content with styled text
function createCellContents(coreNo, mhz, minMhz = 800, maxMhz = 5500) {
    const [red, green, blue] = getGradientColor(mhz, minMhz, maxMhz);

    // Convert to hex representation
    const redHex = red.toString(16).padStart(2, '0');
    const greenHex = green.toString(16).padStart(2, '0');
    const blueHex = blue.toString(16).padStart(2, '0');

    // Style the MHz value with gradient color
    const mhzStyled = `{#${redHex}${greenHex}${blueHex}-fg}${mhz.toFixed(0).padStart(4)} MHz{/}`;

    // Style the rest of the string with a neutral color (gray)
    const coreStyled = `{#aaaaaa-fg}Core ${coreNo}:{/}`;

    return `${coreStyled} ${mhzStyled}`;
}

// // Function to create cell content with styled text
// function createCellContents(coreNo, mhz, minMhz = 800, maxMhz = 5500) {
//     // Normalize MHz to a range [0, 1]
//     const normalized = (mhz - minMhz) / (maxMhz - minMhz);

//     // Convert normalized value to RGB (blue for low, red for high)
//     const red = Math.round(255 * normalized);
//     const green = Math.round(255 * (1 - normalized));
//     const blue = 50; // Slight blue tint for better visibility

//     // Convert to hex representation
//     const redHex = red.toString(16).padStart(2, '0')
//     const greenHex = green.toString(16).padStart(2, '0')
//     const blueHex = blue.toString(16).padStart(2, '0')
//     // Style the MHz value with gradient color
//     const mhzStyled = `{#${redHex}${greenHex}${blueHex}-fg}${mhz.toFixed(0).padStart(4)} MHz{/}`;

//     // Style the rest of the string with a neutral color (gray)
//     const coreStyled = `{#aaaaaa-fg}Core ${coreNo}:{/}`;
//     // const coreStyled = `Core ${coreNo}:`;

//     return `${coreStyled} ${mhzStyled}`;
// }

// Function to create and update the table in a grid layout
function createCpuGrid(interval, numColumns = 4) {
    const screen = blessed.screen({
        smartCSR: true,
        title: 'CPU MHz Monitor'
    });

    const table = blessed.table({
        tags: true,
        top: 'center',
        left: 'center',
        width: '90%',
        height: '90%',
        border: {
            type: 'line'
        },
        style: {

            cell: { fg: 'white' },
            border: { fg: 'cyan' },
        }
    });

    screen.append(table);

    function updateGrid() {
        const cores = getCpuInfo();
        const numRows = Math.ceil(cores.length / numColumns);

        // Create a grid of rows and columns
        let grid = Array.from({ length: numRows }, () => Array(numColumns).fill(''));

        for (let index = 0; index < cores.length; index++) {
            const row = index % numRows; // Determine row first
            const col = Math.floor(index / numRows); // Determine column next
            const coreNo = index.toString().padStart(2, '0');

            grid[row][col] = createCellContents(coreNo, cores[index]);
        }

        // const cores = getCpuInfo();
        // const numRows = Math.ceil(cores.length / numColumns);

        // // Create a grid of rows and columns
        // let grid = [];
        // for (let row = 0; row < numRows; row++) {
        //     let rowData = [];
        //     for (let col = 0; col < numColumns; col++) {
        //         const index = row * numColumns + col;
        //         const coreNo = (index).toString().padStart(2, '0');
        //         if (index < cores.length) {
        //             rowData.push(createCellContents(coreNo, cores[index]));
        //         } else {
        //             rowData.push(''); // Empty cell for padding
        //         }
        //     }
        //     grid.push(rowData);
        // }

        table.setData(grid);
        screen.render();
    }

    updateGrid();
    setInterval(updateGrid, interval);

    screen.key(['q', 'C-c'], () => {
        return process.exit(0);
    });
}

// Check for interval argument
if (process.argv.length < 3) {
    console.error('Usage: node script.js <interval_in_ms>');
    process.exit(1);
}

const interval = parseInt(process.argv[2], 10);
if (isNaN(interval) || interval <= 0) {
    console.error('Please provide a valid interval in milliseconds.');
    process.exit(1);
}

createCpuGrid(interval);

