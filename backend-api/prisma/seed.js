import { PrismaClient, PollCategory, PollStatus, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();
async function main() {
    console.log('🌱 Starting database seeding...');
    // Create admin user
    const adminPassword = await bcrypt.hash('admin@123', 10);
    const admin = await prisma.user.upsert({
        where: { email: 'admin@gmail.com' },
        update: {},
        create: {
            email: 'admin@gmail.com',
            phone: '+919999999999',
            fullName: 'Admin User',
            passwordHash: adminPassword,
            role: UserRole.ADMIN,
            isVerified: true,
            walletBalance: 10000,
        },
    });
    console.log('✅ Admin user created:', admin.email);
    // Create test users
    const userPassword = await bcrypt.hash('password123', 10);
    const testUsers = await Promise.all([
        prisma.user.upsert({
            where: { email: 'user1@example.com' },
            update: {},
            create: {
                email: 'user1@example.com',
                phone: '+919999999901',
                fullName: 'Alice Johnson',
                passwordHash: userPassword,
                isVerified: true,
                walletBalance: 5000,
            },
        }),
        prisma.user.upsert({
            where: { email: 'user2@example.com' },
            update: {},
            create: {
                email: 'user2@example.com',
                phone: '+919999999902',
                fullName: 'Bob Smith',
                passwordHash: userPassword,
                isVerified: true,
                walletBalance: 3000,
            },
        }),
        prisma.user.upsert({
            where: { email: 'user3@example.com' },
            update: {},
            create: {
                email: 'user3@example.com',
                phone: '+919999999903',
                fullName: 'Carol Williams',
                passwordHash: userPassword,
                isVerified: true,
                walletBalance: 2000,
            },
        }),
    ]);
    console.log(`✅ ${testUsers.length} test users created`);
    // Sample polls data
    const pollsData = [
        {
            title: 'Will Bitcoin reach $150,000 by end of 2025?',
            description: 'Bitcoin has shown strong momentum. Will it hit the $150K milestone by December 31, 2025?',
            category: PollCategory.CRYPTO,
            endDate: new Date('2025-12-31'),
            status: PollStatus.ACTIVE,
            imageUrl: 'https://images.unsplash.com/photo-1518546305927-5a555bb7020d',
        },
        {
            title: 'Tesla stock above $400 this quarter?',
            description: 'Tesla has been volatile. Will it close above $400 in Q1 2026?',
            category: PollCategory.BUSINESS,
            endDate: new Date('2026-03-31'),
            status: PollStatus.ACTIVE,
            imageUrl: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89',
        },
        {
            title: 'Will India win the World Cup 2027?',
            description: 'India is a strong contender. Will they bring home the trophy in 2027?',
            category: PollCategory.SPORTS,
            endDate: new Date('2027-11-30'),
            status: PollStatus.ACTIVE,
            imageUrl: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da',
        },
        {
            title: 'BJP wins Bihar Assembly Elections 2025?',
            description: 'Bihar elections are approaching. Will BJP secure majority?',
            category: PollCategory.POLITICS,
            endDate: new Date('2025-11-15'),
            status: PollStatus.ACTIVE,
            imageUrl: 'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620',
        },
        {
            title: 'Will Ethereum reach $10,000 in 2026?',
            description: 'Ethereum 2.0 upgrades are complete. Can ETH hit $10K this year?',
            category: PollCategory.CRYPTO,
            endDate: new Date('2026-12-31'),
            status: PollStatus.ACTIVE,
            imageUrl: 'https://images.unsplash.com/photo-1622630998477-20aa696ecb05',
        },
        {
            title: 'Apple launches AR glasses in 2026?',
            description: 'Rumors suggest Apple is working on AR glasses. Will they launch this year?',
            category: PollCategory.TECHNOLOGY,
            endDate: new Date('2026-12-31'),
            status: PollStatus.ACTIVE,
            imageUrl: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97',
        },
        {
            title: 'Oppenheimer wins Best Picture at Oscars 2026?',
            description: 'Christopher Nolan\'s Oppenheimer is a strong contender. Will it win Best Picture?',
            category: PollCategory.ENTERTAINMENT,
            endDate: new Date('2026-03-10'),
            status: PollStatus.ACTIVE,
            imageUrl: 'https://images.unsplash.com/photo-1594908900066-3f47337549d8',
        },
        {
            title: 'Will Real Madrid win Champions League 2025-26?',
            description: 'Real Madrid is always a favorite. Will they lift the trophy this season?',
            category: PollCategory.SPORTS,
            endDate: new Date('2026-05-31'),
            status: PollStatus.ACTIVE,
            imageUrl: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55',
        },
        {
            title: 'Solana reaches $500 by mid-2026?',
            description: 'Solana has been gaining traction. Can it reach $500 by June 2026?',
            category: PollCategory.CRYPTO,
            endDate: new Date('2026-06-30'),
            status: PollStatus.ACTIVE,
            imageUrl: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0',
        },
        {
            title: 'AI regulation laws passed in India by 2026?',
            description: 'With AI boom, will India pass comprehensive AI regulation laws by end of 2026?',
            category: PollCategory.TECHNOLOGY,
            endDate: new Date('2026-12-31'),
            status: PollStatus.ACTIVE,
            imageUrl: 'https://images.unsplash.com/photo-1677442136019-21780ecad995',
        },
    ];
    // Create polls with options
    for (const pollData of pollsData) {
        const poll = await prisma.poll.create({
            data: {
                ...pollData,
                createdBy: admin.id,
                options: {
                    create: [
                        {
                            optionText: 'Yes',
                            currentOdds: 0.5,
                            totalStaked: 0,
                        },
                        {
                            optionText: 'No',
                            currentOdds: 0.5,
                            totalStaked: 0,
                        },
                    ],
                },
            },
            include: {
                options: true,
            },
        });
        console.log(`✅ Poll created: ${poll.title}`);
    }
    // Add some initial bids to create market activity
    console.log('📊 Creating initial market activity...');
    const allPolls = await prisma.poll.findMany({
        include: { options: true },
    });
    // Place some bids from test users
    for (let i = 0; i < 3 && i < allPolls.length; i++) {
        const poll = allPolls[i];
        const yesOption = poll.options.find(opt => opt.optionText === 'Yes');
        const noOption = poll.options.find(opt => opt.optionText === 'No');
        if (yesOption && noOption) {
            // User 1 bids on Yes
            const bid1Amount = 500;
            await prisma.bid.create({
                data: {
                    userId: testUsers[0].id,
                    pollId: poll.id,
                    optionId: yesOption.id,
                    amount: bid1Amount,
                    oddsAtPurchase: 0.5,
                    potentialWin: bid1Amount / 0.5,
                },
            });
            // User 2 bids on No
            const bid2Amount = 300;
            await prisma.bid.create({
                data: {
                    userId: testUsers[1].id,
                    pollId: poll.id,
                    optionId: noOption.id,
                    amount: bid2Amount,
                    oddsAtPurchase: 0.5,
                    potentialWin: bid2Amount / 0.5,
                },
            });
            // Update poll options with stakes
            await prisma.pollOption.update({
                where: { id: yesOption.id },
                data: {
                    totalStaked: bid1Amount,
                    currentOdds: 0.55, // Adjusted based on activity
                },
            });
            await prisma.pollOption.update({
                where: { id: noOption.id },
                data: {
                    totalStaked: bid2Amount,
                    currentOdds: 0.45,
                },
            });
            // Update poll totals
            await prisma.poll.update({
                where: { id: poll.id },
                data: {
                    totalPool: bid1Amount + bid2Amount,
                    totalVolume: bid1Amount + bid2Amount,
                },
            });
            console.log(`✅ Added market activity for: ${poll.title}`);
        }
    }
    console.log('🎉 Database seeding completed successfully!');
    console.log('\n📝 Login credentials:');
    console.log('   Admin: admin@gmail.com / admin@123');
    console.log('   Test Users: user1@example.com / password123');
    console.log('               user2@example.com / password123');
    console.log('               user3@example.com / password123');
}
main()
    .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
