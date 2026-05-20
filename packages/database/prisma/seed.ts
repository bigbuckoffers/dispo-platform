import { PrismaClient, TeamRole, InvestorType, BuyerTier, PropertyType, DealStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create test org
  const org = await prisma.organization.upsert({
    where: { slug: 'test-dispo-co' },
    update: {},
    create: {
      name: 'Test Dispo Co',
      slug: 'test-dispo-co',
      plan: 'GROWTH',
    },
  });

  // Create test user
  const user = await prisma.user.upsert({
    where: { email: 'admin@testdispo.com' },
    update: {},
    create: {
      clerkId: 'user_test_admin',
      email: 'admin@testdispo.com',
      firstName: 'Test',
      lastName: 'Admin',
    },
  });

  await prisma.teamMember.upsert({
    where: { organizationId_userId: { organizationId: org.id, userId: user.id } },
    update: {},
    create: { organizationId: org.id, userId: user.id, role: TeamRole.OWNER, acceptedAt: new Date() },
  });

  // Create sample buyers
  const buyerData = [
    { firstName: 'Marcus', lastName: 'Johnson', email: 'marcus@example.com', investorType: InvestorType.FIX_AND_FLIP, hasCash: true, tier: BuyerTier.TIER_1, compositeScore: 88 },
    { firstName: 'Sarah', lastName: 'Chen', email: 'sarah@example.com', investorType: InvestorType.LANDLORD, hasCash: true, hasHardMoney: true, tier: BuyerTier.TIER_1, compositeScore: 82 },
    { firstName: 'DeShawn', lastName: 'Williams', email: 'deshawn@example.com', investorType: InvestorType.CASH_BUYER, hasCash: true, tier: BuyerTier.TIER_2, compositeScore: 71 },
    { firstName: 'Rachel', lastName: 'Torres', email: 'rachel@example.com', investorType: InvestorType.HEDGE_FUND, hasCash: true, tier: BuyerTier.TIER_1, compositeScore: 91 },
    { firstName: 'James', lastName: 'Park', email: 'james@example.com', investorType: InvestorType.FIX_AND_FLIP, hasHardMoney: true, tier: BuyerTier.TIER_2, compositeScore: 64 },
    { firstName: 'Alicia', lastName: 'Davis', email: 'alicia@example.com', investorType: InvestorType.LANDLORD, hasCash: false, tier: BuyerTier.TIER_3, compositeScore: 42 },
    { firstName: 'Carlos', lastName: 'Mendez', email: 'carlos@example.com', investorType: InvestorType.WHOLESALER, hasCash: true, tier: BuyerTier.TIER_2, compositeScore: 68 },
    { firstName: 'Kim', lastName: 'Nguyen', email: 'kim@example.com', investorType: InvestorType.DEVELOPER, hasCash: true, tier: BuyerTier.TIER_1, compositeScore: 85 },
  ];

  const buyers = [];
  for (const b of buyerData) {
    const buyer = await prisma.buyer.upsert({
      where: { organizationId_email: { organizationId: org.id, email: b.email } },
      update: {},
      create: {
        organizationId: org.id,
        ...b,
        reliabilityScore: Math.round(b.compositeScore * 0.9 + Math.random() * 10),
        liquidityScore: Math.round(b.compositeScore * 0.85 + Math.random() * 15),
        activityScore: Math.round(b.compositeScore * 0.95 + Math.random() * 8),
        phone: `+1${Math.floor(2000000000 + Math.random() * 8000000000)}`,
        source: ['Referral', 'Event', 'Cold outreach', 'JV partner'][Math.floor(Math.random() * 4)],
      },
    });

    // Create buy boxes
    await prisma.buyBox.upsert({
      where: { buyerId: buyer.id },
      update: {},
      create: {
        buyerId: buyer.id,
        states: ['TX', 'FL', 'GA'].slice(0, Math.floor(Math.random() * 3) + 1),
        minPrice: 80000 + Math.floor(Math.random() * 50000),
        maxPrice: 200000 + Math.floor(Math.random() * 200000),
        propertyTypes: [PropertyType.SINGLE_FAMILY],
        rehabTolerance: ['LIGHT', 'MEDIUM', 'HEAVY'][Math.floor(Math.random() * 3)] as any,
        investmentStrategy: b.investorType === 'LANDLORD' ? ['BUY_AND_HOLD'] : ['FLIP'],
      },
    });

    buyers.push(buyer);
  }

  // Create sample deals
  const dealData = [
    { address: '2847 Oak Hollow Ln', city: 'Dallas', state: 'TX', zipCode: '75217', askingPrice: 145000, arv: 215000, repairEstimate: 35000, beds: 3, baths: 2, sqft: 1450, yearBuilt: 1978, flipScore: 82, landlordScore: 71 },
    { address: '5512 Peach Tree Blvd', city: 'Atlanta', state: 'GA', zipCode: '30310', askingPrice: 89000, arv: 165000, repairEstimate: 45000, beds: 3, baths: 1, sqft: 1200, yearBuilt: 1962, flipScore: 78, landlordScore: 65 },
    { address: '1133 Sunset Ridge Dr', city: 'Tampa', state: 'FL', zipCode: '33617', askingPrice: 195000, arv: 285000, repairEstimate: 52000, beds: 4, baths: 2, sqft: 1820, yearBuilt: 1985, flipScore: 85, landlordScore: 77 },
    { address: '8820 Magnolia Court', city: 'Houston', state: 'TX', zipCode: '77028', askingPrice: 112000, arv: 175000, repairEstimate: 28000, beds: 3, baths: 2, sqft: 1380, yearBuilt: 1971, flipScore: 74, landlordScore: 80 },
    { address: '304 Liberty Oak St', city: 'Jacksonville', state: 'FL', zipCode: '32208', askingPrice: 78000, arv: 140000, repairEstimate: 38000, beds: 3, baths: 1, sqft: 1100, yearBuilt: 1958, flipScore: 69, landlordScore: 72 },
  ];

  for (const d of dealData) {
    await prisma.deal.create({
      data: {
        organizationId: org.id,
        ...d,
        propertyType: PropertyType.SINGLE_FAMILY,
        occupancy: 'VACANT',
        status: Math.random() > 0.3 ? DealStatus.ACTIVE : DealStatus.DRAFT,
        cashBuyerDemand: 70 + Math.floor(Math.random() * 25),
        riskScore: 20 + Math.floor(Math.random() * 40),
        tier1ReleasedAt: Math.random() > 0.5 ? new Date() : null,
      },
    });
  }

  console.log(`✅ Seed complete:`);
  console.log(`   - 1 organization: ${org.name}`);
  console.log(`   - ${buyerData.length} buyers with buy boxes`);
  console.log(`   - ${dealData.length} deals`);
  console.log(`\n🔑 Login: admin@testdispo.com`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
