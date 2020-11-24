/** this source code is in the public domain
  * natechols 2020-11-23
  */

// FIXME the handling of spare blocks when a row is removed is not quite in
// line with the original game, where compound scores were possible as bricks
// kept falling

function make_board () {

var idx = 0;
const WIDTH = 10;
const HEIGHT = 20;
const BUFFER = 20;
const BLOCK_SIZE = 50;
const BLOCK_INNER_SIZE = 46;
const BLOCK_BORDER = 2;
const WIDTH_PIXELS = BUFFER * 2 + WIDTH * BLOCK_SIZE;
const HEIGHT_PIXELS = BUFFER * 2 + HEIGHT * BLOCK_SIZE;
const BRICKS = [
  [
    [1, 1],
    [1, 1]
  ],
  [
    [1, 1, 1, 1]
  ],
  [
    [1, 1, 1],
    [0, 0, 1]
  ],
  [
    [1, 1, 1],
    [1, 0, 0]
  ],
  [
    [1, 1, 0],
    [0, 1, 1]
  ],
  [
    [0, 1, 1],
    [1, 1, 0]
  ],
  [
    [1, 1, 1],
    [0, 1, 0]
  ]
];
const COLORS = [
  "#d00060",
  "#60d060",
  "#d0d000",
  "#d0a000",
  "#d060d0",
  "#a060ff",
  "#6060d0"
];
const LEFT = 0;
const RIGHT = 1;
const DOWN = 2;

function sum(x) {
  return x.reduce(function (a, b) {
    return a + b;
  });
};

function make_pos(i, j) {
  return {
    "x": i,
    "y": j
  };
};

function get_pos_screen(pos) {
  return make_pos(BUFFER + pos.x * BLOCK_SIZE,
                  BUFFER + pos.y * BLOCK_SIZE);
};

function get_block(i, j) {
  return {
    "pos": make_pos(i, j),
    "visible": true
  };
};

function rotate90(a) {
  var transposed = [];
  for (var i = a[0].length - 1; i >= 0; i--) {
    var row = [];
    for (var j = 0; j < a.length; j++) {
      row.push(a[j][i]);
    }
    transposed.push(row);
  }
  return transposed;
};

function rotate_matrix(matrix, rotation) {
  var x = matrix;
  if (rotation === undefined || rotation === 0) {
    return x;
  } else {
    k = 0;
    while (k < rotation) {
      x = rotate90(x);
      k += 1;
    }
    return x;
  }
};

function get_blocks(brickId, rotation) {
  var blocks = [];
  var base = rotate_matrix(BRICKS[brickId], rotation);
  for (var i = 0; i < base.length; i++) {
    for (var j = 0; j < base[i].length; j++) {
      if (base[i][j] == 1) {
        blocks.push(get_block(i, j));
      }
    }
  }
  return blocks;
};

function get_brick(brickId) {
  return {
    "id": idx++,
    "brickId": brickId,
    "rotation": 0,
    "blocks": get_blocks(brickId),
    "active": true
  };
};

function copy_brick(brick) {
  return {
    "id": brick.id,
    "brickId": brick.brickId,
    "rotation": 0,
    "blocks": brick.blocks.map((b) => get_block(b.pos.x, b.pos.y)),
    "active": brick.active
  };
};

function get_random_brick() {
  const brickId = Math.floor(Math.random() * BRICKS.length);
  return get_brick(brickId);
};

// FIXME this makes blocks drift to the right
function rotate_brick(brick) {
  const blocks = brick.blocks;
  const centX = Math.floor(sum(blocks.map((b) => b.pos.x)) / blocks.length);
  const centY = Math.floor(sum(blocks.map((b) => b.pos.y)) / blocks.length);
  if (brick.rotation === 3) {
    brick.rotation = 0;
  } else {
    brick.rotation += 1;
  }
  brick.blocks = get_blocks(brick.brickId, brick.rotation);
  brick.blocks.forEach(function (block) {
    block.pos.x += centX;
    block.pos.y += centY;
  });
};

function is_visible_brick(brick) {
  return brick.blocks.filter((b) => b.visible).length > 1;
};

function make_board_mask(board) {
  var rows = [];
  for (var j = 0; j < HEIGHT; j++) {
    var row = [];
    for (var i = 0; i < WIDTH; i++) {
      row.push(false);
    }
    rows.push(row);
  }
  board.bricks.forEach(function (brick) {
    brick.blocks.forEach(function (block) {
      if (block.visible) {
        rows[block.pos.y][block.pos.x] = true;
      }
    });
  });
  return rows;
};

function find_solid_rows(board) {
  const rows = make_board_mask(board);
  const solidRows = [];
  for (var j = 0; j < HEIGHT; j++) {
    const row = rows[j];
    if (row.every((x) => x === true)) {
      solidRows.push(j);
    }
  }
  return solidRows;
};

function move_block(block, direction) {
  switch (direction) {
    case LEFT:
      block.pos.x--;
      break;
    case RIGHT:
      block.pos.x++;
      break;
    case DOWN:
      block.pos.y++;
      break;
  }
};

function is_in_bounds(block) {
  return block.pos.x >= 0 && block.pos.x < WIDTH && block.pos.y < HEIGHT;
}

function is_overlap(a, b) {
  return a.pos.x === b.pos.x && a.pos.y === b.pos.y;
}

function is_valid_block(block, otherBricks) {
  if (!is_in_bounds(block)) {
    return false;
  }
  if (otherBricks.length > 0) {
    for (var i = 0; i < otherBricks.length; i++) {
      const otherBrick = otherBricks[i];
      for (var j = 0; j < otherBrick.blocks.length; j++) {
        if (is_overlap(block, otherBrick.blocks[j])) {
          return false;
        }
      }
    }
  }
  return true;
}

function copy_blocks(brick) {
  return brick.blocks.map((b) => get_block(b.pos.x, b.pos.y));
}

function can_move_brick(brick, board, direction) {
  const testBlocks = copy_blocks(brick);
  testBlocks.forEach((b) => move_block(b, direction));
  const otherBricks = board.bricks.filter((other) => other.id != brick.id);
  for (var i = 0; i < testBlocks.length; i++) {
    if (!is_valid_block(testBlocks[i], otherBricks)) {
      return false;
    }
  }
  if (otherBricks.length > 0) {
    console.log(testBlocks);
    console.log(otherBricks);
  }
  return true;
}

function can_rotate_brick(brick, board) {
  const testBrick = copy_brick(brick);
  rotate_brick(testBrick);
  const otherBricks = board.bricks.filter((other) => other.id != brick.id);
  for (var i = 0; i < testBrick.blocks.length; i++) {
    if (!is_valid_block(testBrick.blocks[i], otherBricks)) {
      return false;
    }
  }
  return true;
};

function can_move(board, direction) {
  const brick = get_active_brick(board);
  if (brick !== null) {
    return can_move_brick(brick, board, direction);
  }
  return false;
};

function move_brick(brick, board, direction) {
  if (can_move_brick(brick, board, direction)) {
    brick.blocks.map((b) => move_block(b, direction));
    return true;
  } else {
    return false;
  }
}

function move_active_brick(board, direction) {
  const brick = get_active_brick(board);
  if (brick !== null) {
    if (can_move_brick(brick, board, direction)) {
      brick.blocks.map((b) => move_block(b, direction));
      return true;
    } else {
      console.log("can't move");
      return false;
    }
  }
  return false;
}

function rotate_active_brick(board) {
  const brick = get_active_brick(board);
  if (brick !== null) {
    if (can_rotate_brick(brick, board)) {
      rotate_brick(brick);
      return true;
    }
  }
  return false;
}

function get_active_brick(board) {
  if (board.bricks.length > 0) {
    const lastBrick = board.bricks[board.bricks.length - 1];
    if (lastBrick.active) {
      return lastBrick;
    }
  }
  return null;
};

function clear_board(board) {
  board.bricks = [];
  board.active = true;
  board.maxScore = Math.max(board.maxScore, board.score);
  console.log(`maxScore = ${board.maxScore}`);
  board.score = 0;
  document.getElementById("status").textContent = "";
  document.getElementById("score").textContent = "0";
}

function pause_unpause(board) {
  if (board.paused === true) {
    board.paused = false;
    console.log("unpausing");
  } else {
    board.paused = true;
    console.log("pausing");
  }
};

function setup_keys(board) {
  function onKey(evt) {
    switch (evt.code) {
      case "Space":
        if (!board.active) {
          clear_board(board);
        } else {
          console.log("ignoring space, board is active");
        }
        break;
      case "KeyS":
        move_active_brick(board, DOWN);
        break;
      case "KeyA":
        move_active_brick(board, LEFT);
        break;
      case "KeyD":
        move_active_brick(board, RIGHT);
        break;
      case "KeyW":
        rotate_active_brick(board);
        break;
      case "KeyP":
        pause_unpause(board);
        break;
    }
    render_board(board);
  }
  document.addEventListener('keypress', onKey);
}

function render_block(pos, color, ctx) {
  const coords = get_pos_screen(pos);
  ctx.beginPath();
  ctx.fillStyle = color;
  ctx.fillRect(coords.x + BLOCK_BORDER,
               coords.y + BLOCK_BORDER,
               BLOCK_INNER_SIZE,
               BLOCK_INNER_SIZE);
  ctx.stroke();
};

function render_brick(brick, ctx) {
  const color = COLORS[brick.brickId];
  for (var i = 0; i < brick.blocks.length; i++) {
    const block = brick.blocks[i];
    if (block.visible) {
      render_block(block.pos, color, ctx);
    }
  }
};

function render_board(board) {
  const canvas = document.querySelector("canvas");
  const ctx = canvas.getContext('2d');
  ctx.beginPath();
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, WIDTH_PIXELS, HEIGHT_PIXELS);
  ctx.stroke();
  for (var k = 0; k < board.bricks.length; k++) {
    render_brick(board.bricks[k], ctx);
  }
  ctx.beginPath();
  ctx.strokeStyle = "#ffffff";
  ctx.strokeRect(10, 10, WIDTH_PIXELS - 20, HEIGHT_PIXELS - 20);
}

function render_filled_rows(board, rows) {
  const canvas = document.querySelector("canvas");
  const ctx = canvas.getContext('2d');
  for (var k = 0; k < rows.length; k++) {
    const j = rows[k];
    for (var i = 0; i < WIDTH; i++) {
      render_block(make_pos(i, j), "#ffffff", ctx);
    }
  }
};

function add_new_brick(board) {
  const brick = get_random_brick();
  brick.blocks.forEach((b) => b.pos.x += 3);
  if (!can_move_brick(brick, board, DOWN)) {
    console.log("OUT OF MOVES");
    document.getElementById("status").textContent = "GAME OVER - PRESS SPACE TO RESET";
    board.active = false;
    return false;
  }
  board.bricks.push(brick);
};

function remove_rows(board, rows) {
  board.bricks.forEach(function (brick) {
    brick.blocks.forEach(function (block) {
      if (rows.has(block.pos.y)) {
        block.visible = false;
        block.pos = make_pos(-1, -1);
      }
    });
  });
  board.bricks = board.bricks.filter(is_visible_brick);
};

function drop_stacks(board, rows) {
  board.bricks.forEach(function (brick) {
    brick.blocks.forEach(function (block) {
      rows.forEach(function (rowId) {
        if (block.pos.y < rowId) {
          move_block(block, DOWN);
        }
      });
    });
  });
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function setup_interval(board) {
  var rowsToRemove = null;
  var i = 0;
  function onTimer (evt) {
    render_board(board);
    const tId = i % 5;
    if (tId == 0) {
      if (board.paused) {
        return false;
      } else if (board.active && can_move(board, DOWN)) {
        move_active_brick(board, DOWN);
      } else if (board.active) {
        const solidRows = find_solid_rows(board);
        if (solidRows.length > 0) {
          board.score += solidRows.length * solidRows.length;
          document.getElementById("score").textContent = board.score;
          rowsToRemove = new Set(solidRows);
          render_filled_rows(board, solidRows);
        } else {
          add_new_brick(board);
        }
      }
    } else if (rowsToRemove !== null) {
      if (tId === 2) {
        remove_rows(board, rowsToRemove);
      } else if (tId > 2) {
        drop_stacks(board, rowsToRemove);
        rowsToRemove = null;
      }
    }
    i++;
  }
  window.setInterval(onTimer, 100);
};

const board = {
  "bricks": [],
  "active": true,
  "paused": false,
  "score": 0,
  "maxScore": 0
};
setup_keys(board);
render_board(board);
setup_interval(board);
}
