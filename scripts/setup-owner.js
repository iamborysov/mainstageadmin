// Скрипт для створення owner в Firestore
// Виконайте це в консолі браузера (F12) на сторінці вашого додатку

const setupOwner = async (email) => {
  const db = firebase.firestore();
  const normalizedEmail = email.toLowerCase().trim();
  
  const roleData = {
    email: normalizedEmail,
    role: 'owner',
    createdAt: new Date().toISOString(),
    createdBy: 'manual-setup'
  };
  
  try {
    await db.collection('userRoles').doc(normalizedEmail).set(roleData);
    console.log('✅ Owner успішно створено:', normalizedEmail);
    console.log('Дані:', roleData);
  } catch (error) {
    console.error('❌ Помилка:', error);
  }
};

// Замініть на ваш email
setupOwner('your-email@example.com');

// Або виконайте для декількох користувачів:
// setupOwner('owner1@example.com');
// setupOwner('owner2@example.com');
