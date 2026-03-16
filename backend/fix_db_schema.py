
import mysql.connector
import os

db_config = {
    "host": "localhost",
    "user": "root",
    "password": "welcome",
    "database": "TGS_nyt"
}

def fix_db():
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor()
        
        print("Checking travel_custommasterdefinition...")
        cursor.execute("DESC travel_custommasterdefinition")
        columns = [col[0] for col in cursor.fetchall()]
        
        if 'key' not in columns:
            print("Adding 'key' column...")
            cursor.execute("ALTER TABLE travel_custommasterdefinition ADD COLUMN `key` varchar(100) UNIQUE NULL")
        
        if 'module' not in columns:
            print("Adding 'module' column...")
            cursor.execute("ALTER TABLE travel_custommasterdefinition ADD COLUMN `module` varchar(50) NULL")
            
        if 'api_endpoint' not in columns:
            print("Adding 'api_endpoint' column...")
            cursor.execute("ALTER TABLE travel_custommasterdefinition ADD COLUMN `api_endpoint` varchar(255) NULL")
            
        if 'fields_list' not in columns:
            print("Adding 'fields_list' column...")
            cursor.execute("ALTER TABLE travel_custommasterdefinition ADD COLUMN `fields_list` longtext NULL")
            # Update default for existing rows if any
            cursor.execute("UPDATE travel_custommasterdefinition SET fields_list = 'name,code' WHERE fields_list IS NULL")
            cursor.execute("ALTER TABLE travel_custommasterdefinition MODIFY COLUMN `fields_list` longtext NOT NULL")

        conn.commit()
        print("Done fixing travel_custommasterdefinition.")
        
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    fix_db()
