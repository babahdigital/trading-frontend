import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // =========================================
  // 1. Admin User
  // =========================================
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@babahalgo.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123456';

  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existing) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    const admin = await prisma.user.create({
      data: { email: adminEmail, passwordHash, role: 'ADMIN', name: 'Abdullah' },
    });
    console.log(`Admin user created: ${admin.email} (${admin.id})`);
  } else {
    console.log(`Admin user ${adminEmail} already exists, skipping.`);
  }

  // =========================================
  // 2. Landing Sections
  // =========================================
  const landingSections = [
    {
      slug: 'hero',
      title: 'AI-Powered Quantitative Trading',
      subtitle: 'Infrastruktur kecerdasan buatan yang menganalisa pasar 24/7 dengan presisi institusional.',
      sortOrder: 0,
      content: {
        ctaPrimary: { label: 'Lihat Performa', href: '#performance' },
        ctaSecondary: { label: 'Mulai Sekarang', href: '#pricing' },
        kpis: [
          { label: '14', desc: 'Pairs' },
          { label: '24/7', desc: 'AI Scan' },
          { label: '<2ms', desc: 'Latency' },
        ],
      },
    },
    {
      slug: 'performance',
      title: 'Track Record Terverifikasi',
      subtitle: 'Data real-time dari akun produksi',
      sortOrder: 1,
      content: {
        metrics: {
          winRate: 67.2,
          profitFactor: 2.14,
          maxDD: -8.3,
          totalTrades: 847,
          sharpe: 1.85,
          avgHold: '47 min',
        },
        myfxbookUrl: 'https://www.myfxbook.com',
      },
    },
    {
      slug: 'features',
      title: 'Teknologi di Balik Setiap Keputusan',
      subtitle: 'Infrastruktur kelas institusional untuk setiap keputusan trading',
      sortOrder: 2,
      content: {
        items: [
          { icon: 'brain', title: 'AI Advisor', desc: 'Gemini 2.5 Flash analisa setiap pair secara real-time' },
          { icon: 'chart', title: 'Multi-Timeframe', desc: 'H4→H1→M15→M5 confluence scoring' },
          { icon: 'shield', title: 'Risk Management', desc: '12-layer protection system' },
          { icon: 'trending', title: '6 Strategi', desc: 'SMC, Wyckoff, Astronacci, AI Momentum, Oil & Gas' },
          { icon: 'globe', title: '14 Instrumen', desc: 'Forex, Metals, Energy, Crypto' },
          { icon: 'zap', title: '<2ms Execution', desc: 'ZeroMQ execution bridge' },
        ],
      },
    },
    {
      slug: 'strategies',
      title: 'Strategi Diversifikasi',
      subtitle: null,
      sortOrder: 3,
      content: {
        distribution: [
          { name: 'SMC', value: 35, color: '#22c55e' },
          { name: 'Wyckoff Combo', value: 25, color: '#3b82f6' },
          { name: 'AI Momentum', value: 20, color: '#8b5cf6' },
          { name: 'Oil & Gas', value: 10, color: '#f97316' },
          { name: 'Astronacci', value: 5, color: '#06b6d4' },
          { name: 'SMC Swing', value: 5, color: '#ec4899' },
        ],
        winRates: [
          { name: 'SMC', winRate: 67 },
          { name: 'Wyckoff Combo', winRate: 72 },
          { name: 'AI Momentum', winRate: 61 },
          { name: 'Oil & Gas', winRate: 58 },
          { name: 'Astronacci', winRate: 65 },
          { name: 'SMC Swing', winRate: 64 },
        ],
      },
    },
    {
      slug: 'pairs',
      title: '14 Instrumen, 4 Kelas Aset',
      subtitle: 'Diversifikasi across multiple markets',
      sortOrder: 4,
      content: {
        categories: [
          { name: 'FOREX', pairs: ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCHF', 'NZDUSD', 'USDCAD'] },
          { name: 'METALS', pairs: ['XAUUSD', 'XAGUSD'] },
          { name: 'ENERGY', pairs: ['USOIL', 'UKOIL', 'XNGUSD'] },
          { name: 'CRYPTO', pairs: ['BTCUSD', 'ETHUSD'] },
        ],
      },
    },
    {
      slug: 'risk',
      title: '12 Lapisan Perlindungan Modal',
      subtitle: null,
      sortOrder: 5,
      content: {
        layers: [
          'Dynamic lot sizing (equity-aware)',
          'Catastrophic breaker (auto-stop at -X%)',
          'Daily loss limit',
          'Max positions per pair',
          'Max total positions (tier-based)',
          'Protective stop (breakeven ratchet)',
          'News blackout (high-impact auto-pause)',
          'Weekend force-close',
          'Max hold duration (4 jam hard cap)',
          'Cooldown tracker (loss streak pause)',
          'Spread guard (reject jika spread > threshold)',
          'Session drawdown guard',
        ],
      },
    },
    {
      slug: 'pricing',
      title: 'Pilih Model yang Sesuai',
      subtitle: null,
      sortOrder: 6,
      content: {},
    },
    {
      slug: 'how-it-works',
      title: 'Bagaimana Cara Kerjanya',
      subtitle: null,
      sortOrder: 7,
      content: {
        steps: [
          { num: '1', title: 'Daftar & Pilih Paket', desc: 'Pilih model yang sesuai dengan kebutuhan Anda' },
          { num: '2', title: 'Terima Akses Dashboard', desc: 'Dapatkan kredensial login ke portal monitoring' },
          { num: '3', title: 'Bot AI Bekerja 24/7', desc: 'Sistem trading otomatis berjalan di infrastruktur kami' },
          { num: '4', title: 'Pantau Profit Real-Time', desc: 'Lihat performa, posisi, dan laporan kapan saja' },
        ],
      },
    },
    {
      slug: 'testimonials',
      title: 'Apa Kata Mereka',
      subtitle: 'Testimonial dari pengguna aktif BabahAlgo',
      sortOrder: 8,
      content: {},
    },
    {
      slug: 'faq',
      title: 'Pertanyaan yang Sering Ditanyakan',
      subtitle: null,
      sortOrder: 9,
      content: {},
    },
    {
      slug: 'cta',
      title: 'Siap Memulai?',
      subtitle: 'Bergabung dengan ratusan trader yang sudah menggunakan BabahAlgo',
      sortOrder: 10,
      content: {
        ctaPrimary: { label: 'Daftar Sekarang', href: '/register' },
        ctaSecondary: { label: 'Hubungi Kami', href: '/register/vps' },
      },
    },
    {
      slug: 'footer',
      title: 'BabahAlgo',
      subtitle: 'Autonomous Intelligence. Institutional Precision.',
      sortOrder: 11,
      content: {
        contact: {
          whatsapp: '+62 xxx-xxxx-xxxx',
          email: 'info@babahalgo.com',
          telegram: '@babahalgo',
        },
        legal: ['Syarat & Ketentuan', 'Kebijakan Privasi', 'Disclaimer Risiko'],
        disclaimer: 'Perdagangan instrumen finansial mengandung risiko tinggi dan mungkin tidak cocok untuk semua investor. Performa masa lalu tidak menjamin hasil di masa depan.',
      },
    },
  ];

  for (const section of landingSections) {
    await prisma.landingSection.upsert({
      where: { slug: section.slug },
      update: { title: section.title, subtitle: section.subtitle, content: section.content, sortOrder: section.sortOrder },
      create: section,
    });
  }
  console.log(`Seeded ${landingSections.length} landing sections`);

  // =========================================
  // 3. Pricing Tiers
  // =========================================
  const pricingTiers = [
    {
      slug: 'signal-basic',
      name: 'Signal Basic',
      price: '$49/bulan',
      subtitle: null,
      features: ['Dashboard monitoring', 'Sinyal trading harian', 'Laporan performa mingguan'],
      excluded: ['Priority support', 'Akses bot langsung'],
      ctaLabel: 'Daftar',
      ctaLink: '/register/signal',
      sortOrder: 0,
    },
    {
      slug: 'signal-vip',
      name: 'Signal VIP',
      price: '$149/bulan',
      subtitle: null,
      features: ['Dashboard monitoring', 'Sinyal trading real-time', 'Laporan harian detail', 'Priority alerts', 'Telegram group VIP'],
      excluded: ['Akses bot langsung'],
      ctaLabel: 'Daftar',
      ctaLink: '/register/signal',
      sortOrder: 1,
    },
    {
      slug: 'pamm-basic',
      name: 'PAMM Basic',
      price: '20%',
      subtitle: 'profit share',
      features: ['CopyTrade otomatis', 'Dashboard monitoring', 'Laporan harian', 'Min deposit $1,000'],
      excluded: [],
      ctaLabel: 'Daftar',
      ctaLink: '/register/pamm',
      sortOrder: 2,
    },
    {
      slug: 'pamm-pro',
      name: 'PAMM Pro',
      price: '30%',
      subtitle: 'profit share',
      features: ['CopyTrade otomatis', 'Dashboard monitoring', 'Laporan harian', 'Priority support', 'Min deposit $5,000'],
      excluded: [],
      ctaLabel: 'Daftar',
      ctaLink: '/register/pamm',
      sortOrder: 3,
    },
    {
      slug: 'vps-license',
      name: 'VPS License',
      price: '$3,000 - $7,500',
      subtitle: 'setup fee',
      features: ['VPS dedicated', 'Full bot access', 'Dashboard monitoring', 'Priority support 24/7', 'Custom konfigurasi'],
      excluded: [],
      note: '+$150-300/bulan maintenance',
      ctaLabel: 'Hubungi Kami',
      ctaLink: '/register/vps',
      sortOrder: 4,
    },
  ];

  for (const tier of pricingTiers) {
    await prisma.pricingTier.upsert({
      where: { slug: tier.slug },
      update: { name: tier.name, price: tier.price, subtitle: tier.subtitle, features: tier.features, excluded: tier.excluded, ctaLabel: tier.ctaLabel, ctaLink: tier.ctaLink, sortOrder: tier.sortOrder, note: tier.note ?? null },
      create: tier,
    });
  }
  console.log(`Seeded ${pricingTiers.length} pricing tiers`);

  // =========================================
  // 4. FAQs
  // =========================================
  const faqs = [
    { question: 'Apa itu BabahAlgo?', answer: 'BabahAlgo adalah platform trading kuantitatif berbasis AI yang mengelola trading otomatis di pasar Forex, Metals, Energy, dan Crypto.', category: 'GENERAL' as const, sortOrder: 0 },
    { question: 'Apakah modal saya aman?', answer: 'Dana Anda tetap di akun broker Anda sendiri. BabahAlgo hanya mendapatkan akses trading (trade-only), bukan akses penarikan dana.', category: 'SECURITY' as const, sortOrder: 0 },
    { question: 'Berapa minimum deposit?', answer: 'Untuk Signal: tidak ada minimum. Untuk PAMM Basic: $1,000. PAMM Pro: $5,000. VPS License: biaya setup $3,000-$7,500.', category: 'PRICING' as const, sortOrder: 0 },
    { question: 'Bagaimana cara kerja profit sharing?', answer: 'Profit sharing dihitung dari net profit bulanan. Jika bulan tersebut rugi, tidak ada biaya. High watermark diterapkan.', category: 'PRICING' as const, sortOrder: 1 },
    { question: 'Berapa pair yang ditradingkan?', answer: '14 instrumen: 7 Forex, 2 Metals, 3 Energy, 2 Crypto. Semuanya dianalisa secara paralel oleh AI.', category: 'TECHNICAL' as const, sortOrder: 0 },
    { question: 'Apa strategi yang digunakan?', answer: '6 strategi: SMC (Smart Money Concept), Wyckoff Combo, AI Momentum, Oil & Gas, Astronacci, dan SMC Swing. Masing-masing memiliki edge di market condition tertentu.', category: 'TECHNICAL' as const, sortOrder: 1 },
    { question: 'Bagaimana risk management-nya?', answer: '12 lapisan perlindungan: dynamic lot sizing, catastrophic breaker, daily loss limit, news blackout, spread guard, dan lainnya.', category: 'SECURITY' as const, sortOrder: 1 },
    { question: 'Apakah ada jaminan profit?', answer: 'Tidak. Trading selalu mengandung risiko. Performa masa lalu tidak menjamin hasil di masa depan. BabahAlgo dirancang untuk memaksimalkan probabilitas, bukan memberikan jaminan.', category: 'GENERAL' as const, sortOrder: 1 },
  ];

  for (let i = 0; i < faqs.length; i++) {
    const faq = faqs[i];
    const existingFaq = await prisma.faq.findFirst({ where: { question: faq.question } });
    if (!existingFaq) {
      await prisma.faq.create({ data: faq });
    }
  }
  console.log(`Seeded ${faqs.length} FAQs`);

  // =========================================
  // 5. Testimonials
  // =========================================
  const testimonials = [
    { name: 'Andi Pratama', role: 'Trader, Jakarta', content: 'Sudah 6 bulan menggunakan BabahAlgo PAMM. Konsisten profit setiap bulan dengan drawdown yang terkontrol.', rating: 5, sortOrder: 0 },
    { name: 'Sarah Kim', role: 'Investor, Singapore', content: 'Dashboard-nya sangat informatif. Saya bisa memantau semua posisi dan performa secara real-time.', rating: 5, sortOrder: 1 },
    { name: 'Budi Santoso', role: 'Fund Manager, Surabaya', content: 'VPS License memberikan kontrol penuh. Tim support sangat responsif dan membantu setup awal.', rating: 4, sortOrder: 2 },
    { name: 'Michael Chen', role: 'Retail Trader, Kuala Lumpur', content: 'Signal service-nya akurat. Win rate konsisten di atas 65%. Sangat worth it untuk harganya.', rating: 5, sortOrder: 3 },
  ];

  for (const t of testimonials) {
    const existingT = await prisma.testimonial.findFirst({ where: { name: t.name } });
    if (!existingT) {
      await prisma.testimonial.create({ data: t });
    }
  }
  console.log(`Seeded ${testimonials.length} testimonials`);

  // =========================================
  // 6. Page Meta (SEO)
  // =========================================
  const pageMetas = [
    {
      path: '/',
      title: 'BabahAlgo — AI-Powered Quantitative Trading',
      description: 'Infrastruktur trading kuantitatif berbasis AI dengan 14 instrumen, 6 strategi, dan 12 lapisan perlindungan modal.',
      ogTitle: 'BabahAlgo — Autonomous Intelligence. Institutional Precision.',
      ogDescription: 'Platform trading AI yang menganalisa pasar 24/7 dengan presisi institusional.',
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'BabahAlgo',
        alternateName: 'CV Babah Digital',
        url: 'https://babahalgo.com',
        logo: 'https://babahalgo.com/logo.png',
        description: 'AI-Powered Quantitative Trading Platform',
        contactPoint: { '@type': 'ContactPoint', contactType: 'customer service', availableLanguage: ['Indonesian', 'English'] },
        sameAs: [],
      },
    },
    { path: '/register', title: 'Daftar — BabahAlgo', description: 'Pilih paket trading yang sesuai: Signal, PAMM, atau VPS License.' },
    { path: '/register/signal', title: 'Signal Subscriber — BabahAlgo', description: 'Terima sinyal trading otomatis dari AI BabahAlgo.' },
    { path: '/register/pamm', title: 'PAMM Account — BabahAlgo', description: 'CopyTrade otomatis dengan profit sharing transparan.' },
    { path: '/register/vps', title: 'VPS License — BabahAlgo', description: 'Dedicated VPS dengan full bot access untuk institusi dan trader berpengalaman.' },
    {
      path: '/pricing',
      title: 'Harga — BabahAlgo',
      description: 'Bandingkan paket Signal, PAMM, dan VPS License.',
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: 'BabahAlgo Trading Platform',
        description: 'AI-Powered Quantitative Trading with 14 instruments and 6 strategies',
        brand: { '@type': 'Brand', name: 'BabahAlgo' },
        offers: {
          '@type': 'AggregateOffer',
          priceCurrency: 'USD',
          lowPrice: '49',
          highPrice: '7500',
          offerCount: '3',
        },
      },
    },
    {
      path: '/faq',
      title: 'FAQ — BabahAlgo',
      description: 'Pertanyaan yang sering ditanyakan tentang BabahAlgo.',
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [],
      },
    },
    { path: '/features', title: 'Fitur — BabahAlgo', description: 'Teknologi AI dan infrastruktur di balik BabahAlgo.' },
    { path: '/about', title: 'Tentang Kami — BabahAlgo', description: 'Tentang BabahAlgo dan CV Babah Digital.' },
    { path: '/login', title: 'Login — BabahAlgo', description: 'Login ke dashboard BabahAlgo.' },
  ];

  for (const pm of pageMetas) {
    await prisma.pageMeta.upsert({
      where: { path: pm.path },
      update: { title: pm.title, description: pm.description, ogTitle: pm.ogTitle ?? null, ogDescription: pm.ogDescription ?? null, structuredData: pm.structuredData ?? undefined },
      create: pm,
    });
  }
  console.log(`Seeded ${pageMetas.length} page metas`);

  // =========================================
  // 7. Site Settings
  // =========================================
  const settings = [
    { key: 'site_name', value: 'BabahAlgo', type: 'string' },
    { key: 'site_tagline', value: 'Autonomous Intelligence. Institutional Precision.', type: 'string' },
    { key: 'contact_email', value: 'info@babahalgo.com', type: 'string' },
    { key: 'contact_whatsapp', value: '+62 xxx-xxxx-xxxx', type: 'string' },
    { key: 'contact_telegram', value: '@babahalgo', type: 'string' },
    { key: 'brand_primary_color', value: '#0ea5e9', type: 'string' },
    { key: 'brand_secondary_color', value: '#1e3a5f', type: 'string' },
  ];

  for (const s of settings) {
    await prisma.siteSetting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: s,
    });
  }
  console.log(`Seeded ${settings.length} site settings`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
