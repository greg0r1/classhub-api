import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Organization } from '../entities/organization.entity';
import { User } from '../entities/user.entity';
import { Course } from '../entities/course.entity';
import { Subscription } from '../entities/subscription.entity';

/**
 * Script de seeding pour ClassHub API
 * Crée des données de test pour le développement
 *
 * Exécution: npm run seed
 */

async function seed() {
  // Configuration de la connexion à la base de données
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'classhub_user',
    password: process.env.DB_PASSWORD || 'classhub_password_dev',
    database: process.env.DB_DATABASE || 'classhub_dev',
    entities: [__dirname + '/../entities/*.entity{.ts,.js}'],
    synchronize: false,
  });

  try {
    console.log('🔌 Connexion à la base de données...');
    await dataSource.initialize();
    console.log('✅ Connecté à la base de données\n');

    // Nettoyer les données existantes (ordre important pour les FK)
    console.log('🧹 Nettoyage des données existantes...');
    await dataSource.query('DELETE FROM subscriptions');
    await dataSource.query('DELETE FROM attendances');
    await dataSource.query('DELETE FROM courses');
    await dataSource.query('DELETE FROM users WHERE email NOT IN (\'admin@classhub.dev\')'); // Garder admin si existe
    await dataSource.query('DELETE FROM organizations WHERE name NOT IN (\'ClassHub Admin\')'); // Garder org admin si existe
    console.log('✅ Données nettoyées\n');

    // Repositories
    const organizationRepo = dataSource.getRepository(Organization);
    const userRepo = dataSource.getRepository(User);
    const courseRepo = dataSource.getRepository(Course);
    const subscriptionRepo = dataSource.getRepository(Subscription);

    // ═══════════════════════════════════════════════════════════════
    // 1. CRÉER 3 ORGANISATIONS
    // ═══════════════════════════════════════════════════════════════
    console.log('🏢 Création des organisations...');

    const orgs = await organizationRepo.save([
      organizationRepo.create({
        name: 'Dojo Karaté Paris',
        slug: 'dojo-karate-paris',
        email: 'contact@karate-paris.com',
        phone: '+33 1 42 34 56 78',
        address: '123 Rue du Dojo, 75001 Paris',
        logo_url: 'https://via.placeholder.com/200x200?text=Karate',
        subscription_status: 'active',
        subscription_plan: 'pro',
        settings: {
          timezone: 'Europe/Paris',
          default_capacity: 20,
          season_start_month: 9,
          lock_attendance_by_coach: true,
        },
        metadata: {
          website: 'https://karate-paris.com',
          description: 'École de karaté traditionnelle au cœur de Paris. Plus de 30 ans d\'expérience.',
        },
      }),
      organizationRepo.create({
        name: 'Yoga Studio Lyon',
        slug: 'yoga-studio-lyon',
        email: 'hello@yogalyon.fr',
        phone: '+33 4 78 12 34 56',
        address: '45 Avenue de la Paix, 69003 Lyon',
        logo_url: 'https://via.placeholder.com/200x200?text=Yoga',
        subscription_status: 'active',
        subscription_plan: 'premium',
        settings: {
          timezone: 'Europe/Paris',
          default_capacity: 15,
          season_start_month: 9,
          lock_attendance_by_coach: false,
        },
        metadata: {
          website: 'https://yogalyon.fr',
          description: 'Studio de yoga moderne avec cours pour tous niveaux.',
        },
      }),
      organizationRepo.create({
        name: 'CrossFit Marseille',
        slug: 'crossfit-marseille',
        email: 'info@crossfitmarseille.com',
        phone: '+33 4 91 23 45 67',
        address: '78 Boulevard du Sport, 13001 Marseille',
        logo_url: 'https://via.placeholder.com/200x200?text=CrossFit',
        subscription_status: 'trial',
        subscription_plan: 'free',
        trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 jours
        settings: {
          timezone: 'Europe/Paris',
          default_capacity: 12,
          season_start_month: 9,
          lock_attendance_by_coach: true,
        },
        metadata: {
          website: 'https://crossfitmarseille.com',
          description: 'Box CrossFit affiliée avec coaching personnalisé.',
        },
      }),
    ]);

    console.log(`✅ ${orgs.length} organisations créées\n`);

    // ═══════════════════════════════════════════════════════════════
    // 2. CRÉER 20 UTILISATEURS (répartis dans les 3 orgs)
    // ═══════════════════════════════════════════════════════════════
    console.log('👥 Création des utilisateurs...');

    const hashedPassword = await bcrypt.hash('password123', 10);

    const users: User[] = [];

    // Organisation 1: Karaté Paris (8 users: 1 admin, 2 coaches, 5 members)
    users.push(
      ...await userRepo.save([
        userRepo.create({
          email: 'admin.karate@test.com',
          password_hash: hashedPassword,
          first_name: 'Sophie',
          last_name: 'Martin',
          phone: '+33 6 12 34 56 78',
          role: 'admin',
          status: 'active',
          organization_id: orgs[0].id,
          metadata: { belt_level: 'ceinture_noire_4dan', years_experience: 25 },
        }),
        userRepo.create({
          email: 'coach1.karate@test.com',
          password_hash: hashedPassword,
          first_name: 'Pierre',
          last_name: 'Dubois',
          phone: '+33 6 23 45 67 89',
          role: 'coach',
          status: 'active',
          organization_id: orgs[0].id,
          metadata: { belt_level: 'ceinture_noire_3dan', years_experience: 15 },
        }),
        userRepo.create({
          email: 'coach2.karate@test.com',
          password_hash: hashedPassword,
          first_name: 'Marie',
          last_name: 'Leroy',
          phone: '+33 6 34 56 78 90',
          role: 'coach',
          status: 'active',
          organization_id: orgs[0].id,
          metadata: { belt_level: 'ceinture_noire_2dan', years_experience: 10 },
        }),
        userRepo.create({
          email: 'member1.karate@test.com',
          password_hash: hashedPassword,
          first_name: 'Lucas',
          last_name: 'Bernard',
          phone: '+33 6 45 67 89 01',
          role: 'member',
          status: 'active',
          organization_id: orgs[0].id,
          metadata: { belt_level: 'ceinture_marron', medical_cert_date: '2024-09-01' },
        }),
        userRepo.create({
          email: 'member2.karate@test.com',
          password_hash: hashedPassword,
          first_name: 'Emma',
          last_name: 'Petit',
          phone: '+33 6 56 78 90 12',
          role: 'member',
          status: 'active',
          organization_id: orgs[0].id,
          metadata: { belt_level: 'ceinture_verte', medical_cert_date: '2024-08-15' },
        }),
        userRepo.create({
          email: 'member3.karate@test.com',
          password_hash: hashedPassword,
          first_name: 'Hugo',
          last_name: 'Moreau',
          phone: '+33 6 67 89 01 23',
          role: 'member',
          status: 'active',
          organization_id: orgs[0].id,
          metadata: { belt_level: 'ceinture_orange', medical_cert_date: '2024-10-01' },
        }),
        userRepo.create({
          email: 'member4.karate@test.com',
          password_hash: hashedPassword,
          first_name: 'Léa',
          last_name: 'Simon',
          phone: '+33 6 78 90 12 34',
          role: 'member',
          status: 'active',
          organization_id: orgs[0].id,
          metadata: { belt_level: 'ceinture_jaune', medical_cert_date: '2024-09-20' },
        }),
        userRepo.create({
          email: 'member5.karate@test.com',
          password_hash: hashedPassword,
          first_name: 'Noah',
          last_name: 'Laurent',
          phone: '+33 6 89 01 23 45',
          role: 'member',
          status: 'active',
          organization_id: orgs[0].id,
          metadata: { belt_level: 'ceinture_blanche', medical_cert_date: '2024-11-01' },
        }),
      ])
    );

    // Organisation 2: Yoga Lyon (7 users: 1 admin, 2 coaches, 4 members)
    users.push(
      ...await userRepo.save([
        userRepo.create({
          email: 'admin.yoga@test.com',
          password_hash: hashedPassword,
          first_name: 'Claire',
          last_name: 'Fontaine',
          phone: '+33 6 11 22 33 44',
          role: 'admin',
          status: 'active',
          organization_id: orgs[1].id,
          metadata: { certification: 'RYT-500', years_experience: 12 },
        }),
        userRepo.create({
          email: 'coach1.yoga@test.com',
          password_hash: hashedPassword,
          first_name: 'Thomas',
          last_name: 'Rousseau',
          phone: '+33 6 22 33 44 55',
          role: 'coach',
          status: 'active',
          organization_id: orgs[1].id,
          metadata: { certification: 'RYT-300', specialization: 'Vinyasa' },
        }),
        userRepo.create({
          email: 'coach2.yoga@test.com',
          password_hash: hashedPassword,
          first_name: 'Camille',
          last_name: 'Girard',
          phone: '+33 6 33 44 55 66',
          role: 'coach',
          status: 'active',
          organization_id: orgs[1].id,
          metadata: { certification: 'RYT-200', specialization: 'Yin Yoga' },
        }),
        userRepo.create({
          email: 'member1.yoga@test.com',
          password_hash: hashedPassword,
          first_name: 'Alice',
          last_name: 'Mercier',
          phone: '+33 6 44 55 66 77',
          role: 'member',
          status: 'active',
          organization_id: orgs[1].id,
          metadata: { level: 'intermediate', favorite_style: 'Hatha' },
        }),
        userRepo.create({
          email: 'member2.yoga@test.com',
          password_hash: hashedPassword,
          first_name: 'Jules',
          last_name: 'Blanc',
          phone: '+33 6 55 66 77 88',
          role: 'member',
          status: 'active',
          organization_id: orgs[1].id,
          metadata: { level: 'beginner', favorite_style: 'Vinyasa' },
        }),
        userRepo.create({
          email: 'member3.yoga@test.com',
          password_hash: hashedPassword,
          first_name: 'Chloé',
          last_name: 'Garnier',
          phone: '+33 6 66 77 88 99',
          role: 'member',
          status: 'active',
          organization_id: orgs[1].id,
          metadata: { level: 'advanced', favorite_style: 'Ashtanga' },
        }),
        userRepo.create({
          email: 'member4.yoga@test.com',
          password_hash: hashedPassword,
          first_name: 'Louis',
          last_name: 'Faure',
          phone: '+33 6 77 88 99 00',
          role: 'member',
          status: 'active',
          organization_id: orgs[1].id,
          metadata: { level: 'beginner', favorite_style: 'Yin Yoga' },
        }),
      ])
    );

    // Organisation 3: CrossFit Marseille (5 users: 1 admin, 1 coach, 3 members)
    users.push(
      ...await userRepo.save([
        userRepo.create({
          email: 'admin.crossfit@test.com',
          password_hash: hashedPassword,
          first_name: 'Marc',
          last_name: 'Durand',
          phone: '+33 6 98 76 54 32',
          role: 'admin',
          status: 'active',
          organization_id: orgs[2].id,
          metadata: { certification: 'CrossFit Level 3', years_experience: 8 },
        }),
        userRepo.create({
          email: 'coach1.crossfit@test.com',
          password_hash: hashedPassword,
          first_name: 'Julie',
          last_name: 'Roux',
          phone: '+33 6 87 65 43 21',
          role: 'coach',
          status: 'active',
          organization_id: orgs[2].id,
          metadata: { certification: 'CrossFit Level 2', specialization: 'Weightlifting' },
        }),
        userRepo.create({
          email: 'member1.crossfit@test.com',
          password_hash: hashedPassword,
          first_name: 'Alexandre',
          last_name: 'Vincent',
          phone: '+33 6 76 54 32 10',
          role: 'member',
          status: 'active',
          organization_id: orgs[2].id,
          metadata: { level: 'RX', medical_cert_date: '2024-08-01' },
        }),
        userRepo.create({
          email: 'member2.crossfit@test.com',
          password_hash: hashedPassword,
          first_name: 'Sarah',
          last_name: 'Morel',
          phone: '+33 6 65 43 21 09',
          role: 'member',
          status: 'active',
          organization_id: orgs[2].id,
          metadata: { level: 'Scaled', medical_cert_date: '2024-09-15' },
        }),
        userRepo.create({
          email: 'member3.crossfit@test.com',
          password_hash: hashedPassword,
          first_name: 'Maxime',
          last_name: 'Fournier',
          phone: '+33 6 54 32 10 98',
          role: 'member',
          status: 'active',
          organization_id: orgs[2].id,
          metadata: { level: 'Beginner', medical_cert_date: '2024-10-20' },
        }),
      ])
    );

    console.log(`✅ ${users.length} utilisateurs créés (password: password123)\n`);

    // ═══════════════════════════════════════════════════════════════
    // 3. CRÉER DES ABONNEMENTS POUR LES MEMBRES
    // ═══════════════════════════════════════════════════════════════
    console.log('💳 Création des abonnements...');

    const members = users.filter(u => u.role === 'member');
    const subscriptions: Subscription[] = [];

    for (const member of members) {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1); // 1 mois

      subscriptions.push(
        subscriptionRepo.create({
          user_id: member.id,
          organization_id: member.organization_id,
          subscription_type: {
            name: 'Abonnement Mensuel',
            price: 50,
            currency: 'EUR',
            duration_months: 1,
          },
          start_date: startDate,
          end_date: endDate,
          status: 'active',
          amount_paid: 50,
          payment_status: 'paid',
          payment_method: 'card',
          payment_date: startDate,
        })
      );
    }

    await subscriptionRepo.save(subscriptions);
    console.log(`✅ ${subscriptions.length} abonnements créés\n`);

    // ═══════════════════════════════════════════════════════════════
    // 4. CRÉER 50 COURS (répartis dans les 3 orgs)
    // ═══════════════════════════════════════════════════════════════
    console.log('📅 Création des cours...');

    const courses: Course[] = [];
    const now = new Date();

    // Organisation 1: Karaté Paris (20 cours)
    const karateCoaches = users.filter(u => u.organization_id === orgs[0].id && u.role === 'coach');
    const karateCourseTypes = [
      { name: 'Karaté Débutant', level: 'beginner' },
      { name: 'Karaté Intermédiaire', level: 'intermediate' },
      { name: 'Karaté Avancé', level: 'advanced' },
      { name: 'Kata', level: 'all' },
      { name: 'Kumité', level: 'advanced' },
    ];

    for (let i = 0; i < 20; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() + Math.floor(i / 4) - 5); // -5 jours à +15 jours
      date.setHours(18 + (i % 3), 0, 0, 0); // 18h, 19h ou 20h

      const courseType = karateCourseTypes[i % karateCourseTypes.length];
      const coach = karateCoaches[i % karateCoaches.length];

      courses.push(
        courseRepo.create({
          organization: orgs[0],
          title: courseType.name,
          description: `Cours de ${courseType.name.toLowerCase()} - Tous niveaux bienvenus`,
          start_datetime: date,
          end_datetime: new Date(date.getTime() + 60 * 60 * 1000), // +1h
          max_capacity: 20,
          coach_id: coach.id,
          location: 'Dojo Principal',
          status: date < now ? 'completed' : 'scheduled',
          metadata: { level: courseType.level },
        })
      );
    }

    // Organisation 2: Yoga Lyon (20 cours)
    const yogaCoaches = users.filter(u => u.organization_id === orgs[1].id && u.role === 'coach');
    const yogaCourseTypes = [
      { name: 'Hatha Yoga', style: 'hatha' },
      { name: 'Vinyasa Flow', style: 'vinyasa' },
      { name: 'Yin Yoga', style: 'yin' },
      { name: 'Yoga Restoratif', style: 'restorative' },
      { name: 'Power Yoga', style: 'power' },
    ];

    for (let i = 0; i < 20; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() + Math.floor(i / 4) - 5);
      date.setHours(9 + (i % 4) * 3, 0, 0, 0); // 9h, 12h, 15h, 18h

      const courseType = yogaCourseTypes[i % yogaCourseTypes.length];
      const coach = yogaCoaches[i % yogaCoaches.length];

      courses.push(
        courseRepo.create({
          organization: orgs[1],
          title: courseType.name,
          description: `Séance de ${courseType.name.toLowerCase()} pour se ressourcer`,
          start_datetime: date,
          end_datetime: new Date(date.getTime() + 90 * 60 * 1000), // +1h30
          max_capacity: 15,
          coach_id: coach.id,
          location: 'Studio A',
          status: date < now ? 'completed' : 'scheduled',
          metadata: { style: courseType.style },
        })
      );
    }

    // Organisation 3: CrossFit Marseille (10 cours)
    const crossfitCoaches = users.filter(u => u.organization_id === orgs[2].id && u.role === 'coach');
    const crossfitWods = [
      'Fran',
      'Helen',
      'Cindy',
      'Murph',
      'Grace',
      'WOD du jour',
    ];

    for (let i = 0; i < 10; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() + Math.floor(i / 2) - 3);
      date.setHours(7 + (i % 5) * 2, 0, 0, 0); // 7h, 9h, 11h, 13h, 15h

      const wod = crossfitWods[i % crossfitWods.length];
      const coach = crossfitCoaches[i % crossfitCoaches.length];

      courses.push(
        courseRepo.create({
          organization: orgs[2],
          title: `WOD: ${wod}`,
          description: `Séance CrossFit intense - ${wod}`,
          start_datetime: date,
          end_datetime: new Date(date.getTime() + 60 * 60 * 1000), // +1h
          max_capacity: 12,
          coach_id: coach.id,
          location: 'Box Principal',
          status: date < now ? 'completed' : 'scheduled',
          metadata: { wod_name: wod, difficulty: 'RX' },
        })
      );
    }

    await courseRepo.save(courses);
    console.log(`✅ ${courses.length} cours créés\n`);

    // ═══════════════════════════════════════════════════════════════
    // RÉSUMÉ
    // ═══════════════════════════════════════════════════════════════
    console.log('\n' + '═'.repeat(60));
    console.log('✨ SEEDING TERMINÉ AVEC SUCCÈS!');
    console.log('═'.repeat(60));
    console.log(`\n📊 Données créées:`);
    console.log(`   • ${orgs.length} organisations`);
    console.log(`   • ${users.length} utilisateurs`);
    console.log(`   • ${subscriptions.length} abonnements`);
    console.log(`   • ${courses.length} cours`);
    console.log(`\n🔐 Identifiants de test (password: password123):`);
    console.log(`\n   Karaté Paris:`);
    console.log(`   • Admin:  admin.karate@test.com`);
    console.log(`   • Coach:  coach1.karate@test.com`);
    console.log(`   • Member: member1.karate@test.com`);
    console.log(`\n   Yoga Lyon:`);
    console.log(`   • Admin:  admin.yoga@test.com`);
    console.log(`   • Coach:  coach1.yoga@test.com`);
    console.log(`   • Member: member1.yoga@test.com`);
    console.log(`\n   CrossFit Marseille:`);
    console.log(`   • Admin:  admin.crossfit@test.com`);
    console.log(`   • Coach:  coach1.crossfit@test.com`);
    console.log(`   • Member: member1.crossfit@test.com`);
    console.log(`\n🌐 Tester l'API:`);
    console.log(`   curl -X POST http://localhost:3000/auth/login \\`);
    console.log(`     -H "Content-Type: application/json" \\`);
    console.log(`     -d '{"email":"admin.karate@test.com","password":"password123"}'`);
    console.log('\n' + '═'.repeat(60) + '\n');

    await dataSource.destroy();
  } catch (error) {
    console.error('❌ Erreur lors du seeding:', error);
    process.exit(1);
  }
}

// Exécuter le seeding
seed();
