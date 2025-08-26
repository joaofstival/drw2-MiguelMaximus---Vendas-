from .database import engine, SessionLocal
from .models import Base, Product


def run():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.query(Product).first():
            print("Seed: products already exist, skipping")
            return

        items = []
        # Generate ~20 plausible school supply products
        items_data = [
            ("Caderno Universitário 200 folhas", "Brochura, 200 páginas", 18.9, 40, "papelaria", "CAD-200"),
            ("Caderno 100 folhas", "Brochura 100 páginas", 12.5, 80, "papelaria", "CAD-100"),
            ("Lápis HB (unidade)", "Grafite HB", 1.5, 300, "papelaria", "LAP-HB"),
            ("Borracha macia", "Para lápis", 2.5, 150, "papelaria", "BRR-01"),
            ("Caneta esferográfica preta", "Ponta 0.7mm", 2.9, 180, "papelaria", "CAN-PT"),
            ("Caneta vermelha", "Marcador vermelha", 3.0, 120, "papelaria", "CAN-RD"),
            ("Estojo com zíper", "Compartimentos internos", 29.9, 60, "papelaria", "EST-01"),
            ("Mochila 18L", "Resistente, alças acolchoadas", 129.0, 20, "mochilas", "MOC-18"),
            ("Mochila 25L", "Grande, bolsos laterais", 159.0, 12, "mochilas", "MOC-25"),
            ("Réguas 30cm", "Plástico transparente", 4.5, 90, "papelaria", "RG-30"),
            ("Tesoura escolar", "Ponta arredondada", 8.5, 70, "papelaria", "TES-01"),
            ("Cola bastão 20g", "Secagem rápida", 5.5, 140, "papelaria", "COL-20"),
            ("Marcador de texto amarelo", "Fluorescente", 6.5, 110, "papelaria", "MAR-HT"),
            ("Giz de cera (12 cores)", "Kit com 12 cores", 22.0, 45, "instrumentos", "GIZ-12"),
            ("Apontador com reservatório", "Plástico resistente", 3.75, 160, "papelaria", "APO-01"),
            ("Compasso escolar", "Acompanha grafite", 14.9, 50, "instrumentos", "CMP-01"),
            ("Calculadora simples", "8 dígitos", 39.9, 30, "instrumentos", "CAL-08"),
            ("Agenda 2026", "Planejamento anual", 24.5, 25, "papelaria", "AGD-26"),
            ("Caderno de desenho A4", "Papel para desenho", 19.9, 35, "papelaria", "CAD-A4"),
            ("Mochila infantil", "Personagem estampado", 99.0, 15, "mochilas", "MOC-KID"),
        ]

        for name, desc, price, stock, cat, sku in items_data:
            p = Product(name=name, description=desc, price=price, stock=stock, category=cat, sku=sku)
            db.add(p)

        db.commit()
        print("Seed: produtos adicionados (~20)")
    finally:
        db.close()


if __name__ == "__main__":
    run()
