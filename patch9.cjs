const fs = require('fs');
let addCode = fs.readFileSync('src/pages/AddTransaction.jsx', 'utf8');

// 1. Change Category Grid to flex flex-wrap
addCode = addCode.replace(
  'className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-3"',
  'className="flex flex-wrap gap-2 md:gap-3"'
);

// 2. Change Member Grid to flex flex-wrap
addCode = addCode.replace(
  'className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 md:gap-3"',
  'className="flex flex-wrap gap-2 md:gap-3"'
);

// 3. Change CategoryButton styles to have proper padding and min-width
addCode = addCode.replace(
  /gap-1\.5 py-3 px-1 md:p-3 rounded-\[1\.125rem\]/g,
  'gap-2 py-3 px-4 md:px-5 rounded-[1.125rem] flex-grow sm:flex-grow-0'
);

// 4. Change text span styles to remove w-full and just be inline
addCode = addCode.replace(
  /className="text-\[9px\] sm:text-\[10px\] md:text-xs font-bold text-center w-full whitespace-nowrap tracking-tighter px-0\.5"/g,
  'className="text-[10px] sm:text-[11px] md:text-xs font-bold text-center whitespace-nowrap tracking-tight"'
);

fs.writeFileSync('src/pages/AddTransaction.jsx', addCode);
