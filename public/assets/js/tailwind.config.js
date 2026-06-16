  tailwind.config = {
    theme: {
      extend: {
        colors: {
          brand: { 50:'#EEECFF',100:'#DCD8FF',200:'#BBB3FF',300:'#968AFF',400:'#6E5DFF',500:'#4B3AFF',600:'#3A2BE0',700:'#2C20B0',800:'#201880',900:'#150F52' },
          spark: { 300:'#E4FF9E',400:'#D2FF66',500:'#C6FF3D',600:'#A6E81F',700:'#7FB80F' },
          ink: { 50:'#F7F8FA',75:'#F2F4F6',100:'#ECEEF1',150:'#DDE1E6',200:'#C7CCD3',300:'#9AA1AC',400:'#6B7280',500:'#4A515C',600:'#2E333C',700:'#20242B',800:'#16181D',900:'#0E0F12',950:'#0B0C0F' },
          success: { 50:'#E7F8EF',200:'#A8E8C6',500:'#18B368',600:'#149256',700:'#0F7E49' },
          warning: { 50:'#FEF4E1',200:'#F7D88E',500:'#F5A524',700:'#B5760D' },
          danger:  { 50:'#FDE8EB',200:'#FAC4CC',300:'#F79DAA',400:'#F76B7E',500:'#F4384F',600:'#DB2138',700:'#C01B30' },
        },
        fontFamily: {
          display: ['Space Grotesk','sans-serif'],
          body: ['Hanken Grotesk','sans-serif'],
          mono: ['Space Mono','monospace'],
        },
        borderRadius: { xl: '16px', '2xl': '22px', '3xl': '28px' },
        boxShadow: {
          xs: '0 1px 2px rgba(14,15,18,.06)',
          sm: '0 1px 3px rgba(14,15,18,.08),0 1px 2px rgba(14,15,18,.05)',
          md: '0 6px 16px rgba(14,15,18,.08),0 2px 6px rgba(14,15,18,.05)',
          lg: '0 14px 36px rgba(14,15,18,.12),0 4px 10px rgba(14,15,18,.06)',
          xl: '0 28px 70px rgba(14,15,18,.18),0 8px 20px rgba(14,15,18,.08)',
          brand: '0 12px 30px rgba(75,58,255,.30)',
        },
      },
    },
  };
