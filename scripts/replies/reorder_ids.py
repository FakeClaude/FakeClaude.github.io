#!/usr/bin/env python3
"""
python3 /Volumes/SSD/Other/other/Fakeclaude/scripts/replies/reorder_ids.py

将当前目录下所有 .json 文件中的条目,按 type 分组(顺序 = 该 type 在文件中首次出现的顺序),
组内保持原有相对顺序,然后从 1 开始重新连续编号 id。
每个文件独立处理,互不影响。

"""

import json
import os
import glob

def reorder_file(path):
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    if not isinstance(data, list):
        print(f"跳过 {path}(不是数组格式)")
        return

    # 记录 type 首次出现的顺序
    type_order = []
    for item in data:
        t = item.get("type")
        if t not in type_order:
            type_order.append(t)

    # 按 type 分组,组内保持原有顺序
    grouped = {t: [] for t in type_order}
    for item in data:
        grouped[item.get("type")].append(item)

    # 按 type_order 拼接,并重新编号
    new_data = []
    new_id = 1
    for t in type_order:
        for item in grouped[t]:
            item["id"] = new_id
            new_data.append(item)
            new_id += 1

    with open(path, "w", encoding="utf-8") as f:
        json.dump(new_data, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print(f"已处理: {path} (共 {len(new_data)} 条, {len(type_order)} 个 type)")


def main():
    json_files = glob.glob("*.json")
    if not json_files:
        print("当前目录下没有找到 .json 文件")
        return

    for path in json_files:
        try:
            reorder_file(path)
        except Exception as e:
            print(f"处理 {path} 时出错: {e}")


if __name__ == "__main__":
    main()
