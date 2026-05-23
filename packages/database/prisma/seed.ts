import { PrismaClient, TeamRole, InvestorType, BuyerTier, PropertyType, DealStatus } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  console.log('🌱 Seeding database...');
  const org = await prisma.organization.upsert({
    where: { slug: 'bigbuck-offers' },
    update: {},
    create: { name: 'BigBuck Offers', slug: 'bigbuck-offers', plan: 'GROWTH' },
  });
  const user = await prisma.user.upsert({
    where: { email: 'shane@bigbuckoffers.com' },
    update: {},
    create: { clerkId: 'user_shane_admin', email: 'shane@bigbuckoffers.com', firstName: 'Shane', lastName: 'Narvey' },
  });
  await prisma.teamMember.upsert({
    where: { organizationId_userId: { organizationId: org.id, userId: user.id } },
    update: {},
    create: { organizationId: org.id, userId: user.id, role: TeamRole.OWNER, acceptedAt: new Date() },
  });
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
  for (const b of buyerData) {
    const buyer = await prisma.buyer.upsert({
      where: { organizationId_email: { organizationId: org.id, email: b.email } },
      update: {},
      create: {
        organizationId: org.id, ...b,
        reliabilityScore: Math.round(b.compositeScore * 0.9 + Math.random() * 10),
        liquidityScore: Math.round(b.compositeScore * 0.85 + Math.random() * 15),
        activityScore: Math.round(b.compositeScore * 0.95 + Math.random() * 8),
        phone: `+1${Math.floor(2000000000 + Math.random() * 8000000000)}`,
        source: ['Referral', 'Event', 'Cold outreach', 'JV partner'][Math.floor(Math.random() * 4)],
      },
    });
    await prisma.buyBox.upsert({
      where: { buyerId: buyer.id },
      update: {},
      create: {
        buyerId: buyer.id,
        states: ['TX', 'FL', 'AL', 'GA'].slice(0, Math.floor(Math.random() * 3) + 1),
        minPrice: 40000 + Math.floor(Math.random() * 50000),
        maxPrice: 150000 + Math.floor(Math.random() * 150000),
        propertyTypes: [PropertyType.SINGLE_FAMILY],
        rehabTolerance: ['LIGHT', 'MEDIUM', 'HEAVY'][Math.floor(Math.random() * 3)] as any,
        investmentStrategy: b.investorType === 'LANDLORD' ? ['BUY_AND_HOLD'] : ['FLIP'],
      },
    });
  }
  // Real BigBuck Offers deals
  const deals = [
    { address: '3904 Arrejo Ct', city: 'Belle Isle', state: 'FL', zipCode: '32812', county: 'Orange County', askingPrice: 235000, arv: 385000, repairEstimate: 55000, beds: 4, baths: 2, sqft: 1890, yearBuilt: 1978, occupancy: 'VACANT', overallCondition: 'MEDIUM_REHAB', accessInfo: 'By Appointment', financingAllowed: 'HARD_MONEY_OK', vacantAtClose: 'YES', status: DealStatus.READY_TO_MATCH, sourceType: 'JV', dealType: 'WHOLESALE', sourceName: 'Central FL Investments', sourcePhone: '+14075550312', jvSplit: '50/50', jvAgreementStatus: 'Verbal', description: 'Large 4/2 in Belle Isle — one of Central Florida\'s most desirable suburbs. Big spread, strong comps. Medium rehab — kitchen, baths, flooring. JV deal, 50/50 split available.', rentEstimate: 2400, spread: 95000, seventyPercentRuleMax: 214500, dealPriorityScore: 72, dataCompletenessScore: 82, missingInfo: ['Photos', 'Roof age'], missingInfoCount: 2, matchedBuyerCount: 5, tier1MatchCount: 2, nextBestAction: 'Request photos and access info', buyerCoverageStatus: 'Moderate Coverage', buyerGapScore: 51, marketKey: 'Belle Isle, FL', zillowUrl: 'https://www.zillow.com/homes/3904-Arrejo-Ct-Belle-Isle-FL/', hasLiens: false, titleStatus: 'CLEAR', flipScore: 82, landlordScore: 74, cashBuyerDemand: 78 },
    { address: '1983 Hillcrest Cir', city: 'Gordonville', state: 'TX', zipCode: '76245', county: 'Grayson County', askingPrice: 32000, arv: 0, repairEstimate: 0, beds: 3, baths: 2, sqft: 1737, yearBuilt: 2019, occupancy: 'OCCUPIED_TENANT', overallCondition: 'TURNKEY', accessInfo: 'Tenant Access', financingAllowed: 'UNKNOWN', vacantAtClose: 'NO', status: DealStatus.READY_TO_BLAST, sourceType: 'OWN', dealType: 'SUBTO', sourceName: 'BigBuck Offers', description: 'Subject-To deal — 2019 build, tenant paying $1,850/mo, PITI $1,471. HomeTap equity position on title. Entry ~$32k. 2.8% interest rate assumable. Strong cash flow day 1.', rentEstimate: 1850, currentRent: 1850, spread: 0, dealPriorityScore: 88, dataCompletenessScore: 91, missingInfo: ['ARV (not applicable for Subto)'], missingInfoCount: 1, matchedBuyerCount: 18, tier1MatchCount: 5, nextBestAction: 'Generate buyer blast', buyerCoverageStatus: 'Strong Coverage', buyerGapScore: 0, marketKey: 'Gordonville, TX', hasLiens: false, titleStatus: 'CLEAR', flipScore: 40, landlordScore: 92, cashBuyerDemand: 88 },
    { address: '1735 Silver St', city: 'Jacksonville', state: 'FL', zipCode: '32206', county: 'Duval County', askingPrice: 95000, arv: 185000, repairEstimate: 42000, beds: 3, baths: 2, sqft: 1420, yearBuilt: 1955, occupancy: 'VACANT', overallCondition: 'MEDIUM_REHAB', accessInfo: 'Lockbox', financingAllowed: 'HARD_MONEY_OK', vacantAtClose: 'YES', status: DealStatus.READY_TO_BLAST, sourceType: 'OWN', dealType: 'WHOLESALE', sourceName: 'BigBuck Offers', description: 'Historic district 3/2 in Jacksonville 32206. Classic block construction, needs kitchen and bath update, roof 12 years. Excellent comps in this zip. Hard money OK.', rentEstimate: 1650, spread: 48000, seventyPercentRuleMax: 87500, dealPriorityScore: 84, dataCompletenessScore: 88, missingInfo: ['Photos'], missingInfoCount: 1, matchedBuyerCount: 12, tier1MatchCount: 3, nextBestAction: 'Generate buyer blast', buyerCoverageStatus: 'Moderate Coverage', buyerGapScore: 24, marketKey: 'Jacksonville, FL', zillowUrl: 'https://www.zillow.com/homes/1735-Silver-St-Jacksonville-FL/', hasLiens: false, titleStatus: 'CLEAR', flipScore: 84, landlordScore: 71, cashBuyerDemand: 82 },
    { address: '1518 Dallas St', city: 'Killeen', state: 'TX', zipCode: '76541', county: 'Bell County', askingPrice: 89000, arv: 165000, repairEstimate: 28000, beds: 3, baths: 2, sqft: 1340, yearBuilt: 2001, occupancy: 'VACANT', overallCondition: 'MEDIUM_REHAB', accessInfo: 'Lockbox', financingAllowed: 'CASH_ONLY', vacantAtClose: 'YES', status: DealStatus.READY_TO_MATCH, sourceType: 'JV', dealType: 'WHOLESALE', sourceName: 'Marcus Realty Group', sourcePhone: '+12545550101', description: 'Solid 3/2 in Killeen near Ft Cavazos. Medium rehab needed — kitchen and baths dated, roof 8 years old. Strong rental demand in this zip. Cash only.', rentEstimate: 1350, spread: 48000, seventyPercentRuleMax: 87500, dealPriorityScore: 58, dataCompletenessScore: 78, missingInfo: ['Photos', 'Closing date', 'Foundation condition'], missingInfoCount: 3, matchedBuyerCount: 0, tier1MatchCount: 0, nextBestAction: 'Run buyer match', buyerCoverageStatus: 'Buyer Gap', buyerGapScore: 68, marketKey: 'Killeen, TX', marketBuyerNeedRecommendation: 'Find more Killeen/Temple cash buyers — landlords and buy-and-hold investors near Ft Cavazos', hasLiens: false, titleStatus: 'CLEAR', flipScore: 72, landlordScore: 68, cashBuyerDemand: 60 },
    { address: '129 73rd St N', city: 'Birmingham', state: 'AL', zipCode: '35206', county: 'Jefferson County', askingPrice: 52000, arv: 118000, repairEstimate: 35000, beds: 3, baths: 1, sqft: 1180, yearBuilt: 1968, occupancy: 'VACANT', overallCondition: 'HEAVY_REHAB', accessInfo: 'Lockbox', financingAllowed: 'CASH_ONLY', vacantAtClose: 'YES', status: DealStatus.READY_TO_MATCH, sourceType: 'FACEBOOK', dealType: 'WHOLESALE', sourceName: 'Darnell Wholesale', sourcePhone: '+12055550198', facebookGroupName: 'Birmingham Wholesale Deals', description: 'Heavy rehab 3/1 in Birmingham 35206. Needs full kitchen, bathrooms, flooring, and HVAC. Strong ARV in this zip — good flip or rental hold. Vacant, lockbox available.', rentEstimate: 1100, spread: 31000, seventyPercentRuleMax: 47600, dealPriorityScore: 52, dataCompletenessScore: 72, missingInfo: ['Photos', 'Closing date', 'Roof age', 'Foundation condition'], missingInfoCount: 4, matchedBuyerCount: 0, tier1MatchCount: 0, nextBestAction: 'Run buyer match', buyerCoverageStatus: 'Buyer Gap', buyerGapScore: 58, marketKey: 'Birmingham, AL', marketBuyerNeedRecommendation: 'Find more Birmingham cash buyers — Section 8 landlords and heavy-rehab flippers needed in 35206', hasLiens: false, titleStatus: 'CLEAR', flipScore: 65, landlordScore: 60, cashBuyerDemand: 62 },
  ];
  for (const d of deals) {
    await prisma.deal.create({ data: { organizationId: org.id, propertyType: PropertyType.SINGLE_FAMILY, hoaStatus: "UNKNOWN" as any, floodZone: "UNKNOWN" as any, assignmentAllowed: "UNKNOWN" as any, doubleCloseNeeded: "UNKNOWN" as any, ...d } as any });
  }
  console.log(`✅ Seed complete:`);
  console.log(`   - 1 organization: BigBuck Offers`);
  console.log(`   - ${buyerData.length} buyers with buy boxes`);
  console.log(`   - ${deals.length} real BigBuck Offers deals`);
  console.log(`\n🔑 Login: shane@bigbuckoffers.com`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
