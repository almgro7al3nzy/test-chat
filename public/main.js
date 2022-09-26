$(function() {
  const FADE_TIME = 150; // ms
  const TYPING_TIMER_LENGTH = 400; // ms
  const COLORS = [
    '#e21400', '#91580f', '#f8a700', '#f78b00',
    '#58dc00', '#287b00', '#a8f07a', '#4ae8c4',
    '#3b88eb', '#3824aa', '#a700ff', '#d300e7'
  ];

// تهيئة المتغيرات
  const $window = $(window);
  const $usernameInput = $('.usernameInput'); // إدخال لاسم المستخدم
  const $messages = $('.messages');           // منطقة الرسائل
  const $inputMessage = $('.inputMessage');   // مربع إدخال رسالة الإدخال
  
  const userList = document.getElementById('users'); // قائمة المستخدم

  const $loginPage = $('.login.page');        //صفحة تسجيل الدخول
  const $chatPage = $('.chat.page');          // صفحة غرفة الدردشة

  const socket = io();

// المطالبة بتعيين اسم مستخدم
  let username;
  let connected = false;
  let typing = false;
  let lastTypingTime;
  let $currentInput = $usernameInput.focus();

  const addParticipantsMessage = (data) => {
    let message = '';
    if (data.numUsers === 1) {
      message += `there's 1 participant`;
    } else {
      message += `there are ${data.numUsers} participants`;
    }
    log(message);
  }

  //يعيّن اسم المستخدم الخاص بالعميل
  const setUsername = () => {
    username = cleanInput($usernameInput.val().trim());

    // إذا كان اسم المستخدم صالحًا
    if (username) {
      $loginPage.fadeOut();
      $chatPage.show();
      $loginPage.off('click');
      $currentInput = $inputMessage.focus();

      // أخبر الخادم باسم المستخدم الخاص بك
      socket.emit('add user', username);
    }
  }

  // يرسل رسالة دردشة
  const sendMessage = () => {
    let message = $inputMessage.val();
    //منع حقن المكياج في الرسالة
    message = cleanInput(message);
    // إذا كانت هناك رسالة غير فارغة ووصلة مقبس
    if (message && connected) {
      $inputMessage.val('');
      addChatMessage({ username, message });
      //اطلب من الخادم تنفيذ "رسالة جديدة" وإرسال معلمة واحدة
      socket.emit('new message', message);
    }
  }

  // سجل رسالة
  const log = (message, options) => {
    const $el = $('<li>').addClass('log').text(message);
    addMessageElement($el, options);
  }

  //يضيف رسالة الدردشة المرئية إلى قائمة الرسائل
  const addChatMessage = (data, options = {}) => {
    // لا تتلاشى الرسالة إذا كان هناك "X كان يكتب"
    const $typingMessages = getTypingMessages(data);
    if ($typingMessages.length !== 0) {
      options.fade = false;
      $typingMessages.remove();
    }

    const $usernameDiv = $('<span class="username"/>')
      .text(data.username)
      .css('color', getUsernameColor(data.username));
    const $messageBodyDiv = $('<span class="messageBody">')
      .text(data.message);

    const typingClass = data.typing ? 'typing' : '';
    const $messageDiv = $('<li class="message"/>')
      .data('username', data.username)
      .addClass(typingClass)
      .append($usernameDiv, $messageBodyDiv);

    addMessageElement($messageDiv, options);
  }

  //يضيف رسالة كتابة الدردشة المرئية
  const addChatTyping = (data) => {
    data.typing = true;
    data.message = 'is typing';
    addChatMessage(data);
  }

// يزيل رسالة كتابة الدردشة المرئية
  const removeChatTyping = (data) => {
    getTypingMessages(data).fadeOut(function () {
      $(this).remove();
    });
  }
// يضيف عنصر رسالة إلى الرسائل وينتقل إلى أسفل
  // el - العنصر المراد إضافته كرسالة
  // options.fade - إذا كان العنصر يجب أن يتلاشى (افتراضي = صحيح)
  // options.prepend - إذا كان يجب أن يكون العنصر مقدمًا
  // كل الرسائل الأخرى (افتراضي = خطأ)
  const addMessageElement = (el, options) => {
    const $el = $(el);
    // إعداد الخيارات الافتراضية
    if (!options) {
      options = {};
    }
    if (typeof options.fade === 'undefined') {
      options.fade = true;
    }
    if (typeof options.prepend === 'undefined') {
      options.prepend = false;
    }

    //تطبيق الخيارات
    if (options.fade) {
      $el.hide().fadeIn(FADE_TIME);
    }
    if (options.prepend) {
      $messages.prepend($el);
    } else {
      $messages.append($el);
    }

    $messages[0].scrollTop = $messages[0].scrollHeight;
  }

  //يمنع الإدخال من الترميز المحقون
  const cleanInput = (input) => {
    return $('<div/>').text(input).html();
  }

  //يحدّث حدث الكتابة
  const updateTyping = () => {
    if (connected) {
      if (!typing) {
        typing = true;
        socket.emit('typing');
      }
      lastTypingTime = (new Date()).getTime();

      setTimeout(() => {
        const typingTimer = (new Date()).getTime();
        const timeDiff = typingTimer - lastTypingTime;
        if (timeDiff >= TYPING_TIMER_LENGTH && typing) {
          socket.emit('stop typing');
          typing = false;
        }
      }, TYPING_TIMER_LENGTH);
    }
  }

// يحصل على "X يكتب" رسائل المستخدم
  const getTypingMessages = (data) => {
    return $('.typing.message').filter(function (i) {
      return $(this).data('username') === data.username;
    });
  }

// يحصل على لون اسم المستخدم من خلال دالة التجزئة الخاصة بنا
  const getUsernameColor = (username) => {
    // حساب كود التجزئة
    let hash = 7;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + (hash << 5) - hash;
    }
    // احسب اللون
    const index = Math.abs(hash % COLORS.length);
    return COLORS[index];
  }

  // أحداث لوحة المفاتيح

  $window.keydown(event => {
    // التركيز التلقائي على الإدخال الحالي عند كتابة مفتاح
    if (!(event.ctrlKey || event.metaKey || event.altKey)) {
      $currentInput.focus();
    }
    // عندما يقوم العميل بالضغط على ENTER على لوحة المفاتيح الخاصة به
    if (event.which === 13) {
      if (username) {
        sendMessage();
        socket.emit('stop typing');
        typing = false;
      } else {
        setUsername();
      }
    }
  });

  $inputMessage.on('input', () => {
    updateTyping();
  });

// انقر فوق الأحداث

  // التركيز على الإدخال عند النقر في أي مكان على صفحة تسجيل الدخول
  $loginPage.click(() => {
    $currentInput.focus();
  });

// التركيز على الإدخال عند النقر فوق حد إدخال الرسالة
  $inputMessage.click(() => {
    $inputMessage.focus();
  });

// أحداث المقبس

  // عندما يرسل الخادم "تسجيل دخول" ، سجّل رسالة تسجيل الدخول
  socket.on('login', (data) => {
    connected = true;
    // Display the welcome message
    const message = 'مرحبًا بك في Socket.IO Chat -';
    log(message, {
      prepend: true
    });
    addParticipantsMessage(data);
  });

// عندما يرسل الخادم "رسالة جديدة" ، قم بتحديث نص المحادثة
  socket.on('new message', (data) => {
    addChatMessage(data);
  });

// عندما يرسل الخادم "انضمام المستخدم" ، قم بتسجيله في نص المحادثة
  socket.on('user joined', (data) => {
    log(`${data.username} joined`);
    addParticipantsMessage(data);
  });

// عندما يرسل الخادم "المستخدم غادر" ، قم بتسجيله في نص المحادثة
  socket.on('user left', (data) => {
    log(`${data.username} left`);
    addParticipantsMessage(data);
    removeChatTyping(data);
  });

// عندما يرسل الخادم "كتابة" ، اعرض رسالة الكتابة
  socket.on('typing', (data) => {
    addChatTyping(data);
  });

// عندما يرسل الخادم "توقف عن الكتابة" ، اقتل رسالة الكتابة
  socket.on('stop typing', (data) => {
    removeChatTyping(data);
  });

  socket.on('disconnect', () => {
    log('لقد تم قطع الاتصال');
  });

  socket.io.on('reconnect', () => {
    log('لقد تم إعادة الاتصال');
    if (username) {
      socket.emit('add user', username);
    }
  });

  socket.io.on('reconnect_error', () => {
    log('فشلت محاولة إعادة الاتصال');
  });

});
