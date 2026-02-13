def print_pyramid(height: int) -> None:
    """高さ height のピラミッドを * で表示する."""
    for i in range(1, height + 1):
        # 左側のスペース
        spaces = " " * (height - i)
        # ピラミッド部分（奇数個の *）
        stars = "*" * (2 * i - 1)
        print(spaces + stars)


def main() -> None:
    while True:
        try:
            text = input("ピラミッドの高さを整数で入力してください: ")
            height = int(text)
            if height <= 0:
                print("正の整数を入力してください。")
                continue
            break
        except ValueError:
            print("整数として解釈できませんでした。もう一度入力してください。")

    print_pyramid(height)


if __name__ == "__main__":
    main()

