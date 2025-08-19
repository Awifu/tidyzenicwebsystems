// app.js

function initNewsletterForm() {
  const form = document.querySelector(".newsletter-form");
  if (!form) return;

  // Create feedback elements if they don't exist
  let successMsg = form.querySelector(".newsletter-success-message");
  let errorMsg = form.querySelector(".newsletter-error-message");

  if (!successMsg) {
    successMsg = document.createElement("div");
    successMsg.className = "newsletter-success-message text-green-600 text-sm mt-2 hidden";
    successMsg.textContent = "🎉 You're subscribed successfully!";
    form.appendChild(successMsg);
  }

  if (!errorMsg) {
    errorMsg = document.createElement("div");
    errorMsg.className = "newsletter-error-message text-red-600 text-sm mt-2 hidden";
    errorMsg.textContent = "⚠️ Something went wrong or you're already subscribed.";
    form.appendChild(errorMsg);
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = form.email.value.trim();

    if (!email) {
      errorMsg.textContent = "⚠️ Please enter a valid email.";
      errorMsg.classList.remove("hidden");
      successMsg.classList.add("hidden");
      setTimeout(() => errorMsg.classList.add("hidden"), 4000);
      return;
    }

    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        form.reset();
        successMsg.textContent = "🎉 You're subscribed successfully!";
        successMsg.classList.remove("hidden");
        errorMsg.classList.add("hidden");
        setTimeout(() => successMsg.classList.add("hidden"), 4000);
      } else {
        const errorData = await res.json().catch(() => ({}));
        errorMsg.textContent = errorData?.message || "⚠️ Something went wrong or you're already subscribed.";
        errorMsg.classList.remove("hidden");
        successMsg.classList.add("hidden");
        setTimeout(() => errorMsg.classList.add("hidden"), 4000);
      }
    } catch (err) {
      console.error("Newsletter error:", err);
      errorMsg.textContent = "⚠️ Network error. Please try again later.";
      errorMsg.classList.remove("hidden");
      successMsg.classList.add("hidden");
      setTimeout(() => errorMsg.classList.add("hidden"), 4000);
    }
  });
}

window.addEventListener("load", async () => {
  async function loadComponent(url, placeholderId) {
    const placeholder = document.getElementById(placeholderId);
    if (!placeholder) return;

    try {
      const response = await fetch(url);
      if (response.ok) {
        const html = await response.text();
        placeholder.insertAdjacentHTML("beforeend", html);

        if (placeholderId === "header-placeholder") initHeader();
        else if (placeholderId === "footer-placeholder") initNewsletterForm();
      } else {
        console.error(`❌ Failed to load ${url}: ${response.statusText}`);
      }
    } catch (err) {
      console.error(`❌ Error fetching ${url}:`, err);
    }
  }

  await loadComponent("/header.html", "header-placeholder");
  await loadComponent("/footer.html", "footer-placeholder");

  function initHeader() {
    const hamburger = document.getElementById("hamburger");
    const nav = document.getElementById("nav");
    const submenuToggle = document.querySelector(".submenu-toggle");
    const submenu = document.getElementById("features-submenu");

    if (hamburger && nav) {
      hamburger.addEventListener("click", () => {
        nav.classList.toggle("show");
        hamburger.classList.toggle("active");
      });
    }

    if (submenuToggle && submenu) {
      submenuToggle.addEventListener("click", (e) => {
        e.preventDefault();
        submenu.classList.toggle("hidden");
      });

      document.addEventListener("click", (e) => {
        if (!submenu.contains(e.target) && !submenuToggle.contains(e.target)) {
          submenu.classList.add("hidden");
        }
      });
    }
  }

  const blogPosts = [
    {
      title: "Introducing Smart Scheduling",
      summary: "Our new AI-powered scheduling assistant helps you optimize bookings and staff assignments effortlessly.",
      link: "/blog/smart-scheduling",
      image: "https://placehold.co/400x200/4f46e5/ffffff?text=AI+Scheduling",
    },
    {
      title: "TidyZenic now supports multi-tenant architecture",
      summary: "Launch your own white-label platform with ease using our new multi-tenant features.",
      link: "/blog/multi-tenant",
      image: "https://placehold.co/400x200/4f46e5/ffffff?text=Multi-tenant",
    },
    {
      title: "Boost your business with integrated CRM",
      summary: "Learn how TidyZenic's powerful CRM tools can help you build stronger client relationships.",
      link: "/blog/integrated-crm",
      image: "https://placehold.co/400x200/4f46e5/ffffff?text=Integrated+CRM",
    },
    {
      title: "Maximize Efficiency with Inventory Management",
      summary: "A deep dive into how TidyZenic helps you track supplies and automate re-ordering.",
      link: "/blog/inventory-management",
      image: "https://placehold.co/400x200/4f46e5/ffffff?text=Inventory+Management",
    },
  ];

  function renderBlogPosts() {
    const blogGrid = document.getElementById("blog-grid");
    const blogSkeleton = document.getElementById("blog-skeleton");
    if (!blogGrid) return;

    blogGrid.innerHTML = blogPosts
      .map((post) => `
        <a href="${post.link}" class="block rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition bg-white group">
          <img src="${post.image}" alt="${post.title}" class="w-full h-44 object-cover">
          <div class="p-6">
            <h3 class="text-lg font-semibold text-gray-900 group-hover:text-brand-700 transition">${post.title}</h3>
            <p class="mt-2 text-sm text-gray-500">${post.summary}</p>
          </div>
        </a>
      `)
      .join("");

    if (blogSkeleton) blogSkeleton.style.display = "none";
  }

  const reviews = [
    {
      text: "TidyZenic has transformed my cleaning business. The AI scheduling is a game-changer and has saved me countless hours.",
      author: "Jane Doe",
      company: "Spotless Services",
    },
    {
      text: "The white-label solution allowed me to launch my own platform in a fraction of the time. The support team is fantastic!",
      author: "John Smith",
      company: "Prime Plumbing",
    },
    {
      text: "Seamless client management and marketing tools all in one place. My business has never been more organized.",
      author: "Emily Chen",
      company: "Garden Gurus",
    },
  ];

  function renderReviews() {
    const reviewsGrid = document.getElementById("reviews-grid");
    const reviewsSkeleton = document.getElementById("reviews-skeleton");
    if (!reviewsGrid) return;

    reviewsGrid.innerHTML = reviews
      .map((review) => `
        <div class="p-6 rounded-2xl bg-white border border-gray-100 shadow-sm">
          <p class="text-gray-600">"${review.text}"</p>
          <div class="mt-4 text-sm font-semibold text-gray-900">
            ${review.author}, <span class="text-gray-500 font-normal">${review.company}</span>
          </div>
        </div>
      `)
      .join("");

    if (reviewsSkeleton) reviewsSkeleton.style.display = "none";
  }

  function drawChart() {
    const canvas = document.getElementById("revenueChart");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const data = [10, 25, 20, 35, 30, 50];

    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    canvas.width = width;
    canvas.height = height;

    const padding = 20;
    const points = data.length;
    const maxVal = Math.max(...data);

    ctx.clearRect(0, 0, width, height);

    const areaGradient = ctx.createLinearGradient(0, 0, 0, height);
    areaGradient.addColorStop(0, "rgba(79, 70, 229, 0.4)");
    areaGradient.addColorStop(1, "rgba(79, 70, 229, 0)");

    const lineGradient = ctx.createLinearGradient(0, 0, width, 0);
    lineGradient.addColorStop(0, "rgba(79, 70, 229, 1)");
    lineGradient.addColorStop(1, "rgba(129, 140, 248, 1)");

    const coords = data.map((d, i) => ({
      x: padding + (i / (points - 1)) * (width - 2 * padding),
      y: height - padding - (d / maxVal) * (height - 2 * padding),
    }));

    ctx.beginPath();
    ctx.moveTo(coords[0].x, height - padding);
    coords.forEach((c) => ctx.lineTo(c.x, c.y));
    ctx.lineTo(coords[coords.length - 1].x, height - padding);
    ctx.closePath();
    ctx.fillStyle = areaGradient;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(coords[0].x, coords[0].y);
    coords.forEach((c) => ctx.lineTo(c.x, c.y));
    ctx.strokeStyle = lineGradient;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();

    coords.forEach((c) => {
      ctx.beginPath();
      ctx.arc(c.x, c.y, 4, 0, 2 * Math.PI);
      ctx.fillStyle = "white";
      ctx.strokeStyle = "#4f46e5";
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();
    });
  }

  renderBlogPosts();
  renderReviews();

  const chartCanvas = document.getElementById("revenueChart");
  if (chartCanvas) {
    const resizeObserver = new ResizeObserver(() => drawChart());
    resizeObserver.observe(chartCanvas);
    drawChart();
  }
});
