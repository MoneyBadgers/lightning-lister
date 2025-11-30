<template>
  <div class="container">
    <h1>Lightning Invoice Tracker</h1>

    <!-- INPUT -->
    <div class="input-section">
      <label><strong>Paste Lightning Invoice (BOLT11)</strong></label>
      <textarea
        v-model.trim="currentInvoice"
        @input="handleInvoiceInput"
        placeholder="lnbc1..."
      ></textarea>
      <div v-if="parseError" class="error">{{ parseError }}</div>
    </div>

    <!-- PARSED DETAILS -->
    <div class="card">
      <h2>Parsed Invoice</h2>

      <template v-if="parsedInvoice">
        <div class="field"><strong>Satoshis:</strong> {{ parsedInvoice.satoshis }}</div>
        <div class="field"><strong>Description:</strong> {{ parsedInvoice.description }}</div>
        <div class="field"><strong>Timestamp:</strong> {{ parsedInvoice.timestamp }}</div>
        <div class="field"><strong>Expiry (s):</strong> {{ parsedInvoice.expiry }}</div>
      </template>

      <template v-else>
        <p class="empty">Paste a valid invoice above to see details.</p>
      </template>

      <button
        class="btn btn-primary"
        :disabled="!parsedInvoice"
        @click="addInvoice"
      >
        ➕ Add Invoice
      </button>
    </div>

    <!-- TABLE + EXPORT -->
    <div class="table-section">
      <button
        class="btn btn-secondary"
        @click="exportCsv"
        :disabled="invoices.length === 0"
      >
        ⬇️ Export CSV
      </button>

      <table v-if="invoices.length">
        <thead>
          <tr>
            <th>#</th>
            <th>Sats</th>
            <th>Description</th>
            <th>Timestamp</th>
            <th>Expiry (s)</th>
            <th></th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="(inv, i) in invoices" :key="inv.id">
            <td>{{ i + 1 }}</td>
            <td>{{ inv.satoshis }}</td>
            <td>{{ inv.description }}</td>
            <td>{{ inv.timestamp }}</td>
            <td>{{ inv.expiry }}</td>
            <td>
              <button class="btn btn-danger btn-sm" @click="deleteInvoice(i)">
                Delete
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <p v-else class="empty">No invoices saved yet.</p>
    </div>
  </div>
</template>

<script>
import { decode as decodeBolt11 } from "light-bolt11-decoder";

export default {
  name: "App",

  data() {
    return {
      currentInvoice: "",
      parsedInvoice: null,
      parseError: "",
      invoices: [],
      STORAGE_KEY: "ln_invoice_tracker_v1",
    };
  },

  created() {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved) {
      try {
        this.invoices = JSON.parse(saved);
      } catch {
        this.invoices = [];
      }
    }
  },

  methods: {
    handleInvoiceInput() {
      this.parseError = "";
      this.parsedInvoice = null;

      if (!this.currentInvoice) return;

      try {
        let inv = this.currentInvoice.trim();
        // strip common prefixes
        if (inv.toLowerCase().startsWith("lightning:")) {
          inv = inv.slice("lightning:".length);
        }

        const decoded = decodeBolt11(inv);

        // decoded.sections is an array like the README example
        const sections = decoded.sections || [];

        const getSection = (name) =>
          sections.find((s) => s.name === name);

        const amountSection = getSection("amount");
        const descriptionSection = getSection("description");
        const tsSection = getSection("timestamp");
        const expirySection = getSection("expiry");
        const paymentHashSection = getSection("payment_hash");

        // amountSection.value is msats as a string (e.g. "2000000")
        let satoshis = null;
        if (amountSection && amountSection.value != null) {
          const msats = Number(amountSection.value);
          if (!Number.isNaN(msats)) {
            satoshis = Math.round(msats / 1000);
          }
        }

        const timestampIso =
          tsSection && tsSection.value
            ? new Date(tsSection.value * 1000).toISOString()
            : "";

        const expiry =
          (expirySection && expirySection.value) ??
          decoded.expiry ??
          "";

        const paymentHash =
          (paymentHashSection && paymentHashSection.value) || "";

        this.parsedInvoice = {
          raw: inv,
          satoshis,
          description: (descriptionSection && descriptionSection.value) || "",
          timestamp: timestampIso,
          expiry,
          paymentHash,
        };
      } catch (e) {
        this.parseError = e?.message || "Invalid invoice";
      }
    },

    addInvoice() {
      if (!this.parsedInvoice) return;

      this.invoices.unshift({
        id: Date.now(),
        ...this.parsedInvoice,
      });

      this.currentInvoice = "";
      this.parsedInvoice = null;
      this.save();
    },

    deleteInvoice(index) {
      this.invoices.splice(index, 1);
      this.save();
    },

    save() {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.invoices));
    },

    exportCsv() {
      const header = [
        "satoshis",
        "description",
        "timestamp",
        "expiry_seconds",
        "payment_hash",
        "raw_invoice",
      ];
      const rows = [header.join(",")];

      this.invoices.forEach((inv) => {
        rows.push(
          [
            inv.satoshis ?? "",
            JSON.stringify(inv.description ?? ""),
            inv.timestamp ?? "",
            inv.expiry ?? "",
            inv.paymentHash ?? "",
            JSON.stringify(inv.raw ?? ""),
          ].join(","),
        );
      });

      const blob = new Blob([rows.join("\n")], { type: "text/csv" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "lightning_invoices.csv";
      a.click();
      URL.revokeObjectURL(url);
    },
  },
};
</script>

<style>
body {
  margin: 0;
  font-family: system-ui, sans-serif;
  background: #f4f4f5;
}
.container {
  max-width: 900px;
  margin: auto;
  padding: 20px;
}
textarea {
  width: 100%;
  min-height: 80px;
  padding: 8px;
  font-family: monospace;
}
.card {
  background: white;
  padding: 16px;
  margin-top: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}
.btn {
  padding: 6px 14px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
.btn-primary {
  background: #4f46e5;
  color: white;
}
.btn-secondary {
  background: #e5e7eb;
}
.btn-danger {
  background: #dc2626;
  color: white;
}
.btn-sm {
  padding: 4px 10px;
  font-size: 0.8rem;
}
.table-section {
  margin-top: 30px;
}
table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  margin-top: 15px;
}
th,
td {
  padding: 6px 10px;
  border-bottom: 1px solid #ddd;
  vertical-align: top;
}
.mono {
  font-family: monospace;
  word-break: break-all;
}
.empty {
  color: #6b7280;
  font-size: 0.9rem;
}
.field {
  margin-bottom: 4px;
  text-align: left;
}
.error {
  color: #b91c1c;
}
</style>