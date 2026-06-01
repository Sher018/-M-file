function points = func_import_points(filename)
    % FUNC_IMPORT_POINTS Импорт параметров сети с группировкой по точкам КЗ.
    % Автор: Юнусов Шероз, ИРНИТУ, магистерская диссертация, 2026 г.
    % Версия: 1.3.0
    % Подраздел диплома: 3.2 «Модуль импорта исходных данных»
    %
    % Если в таблице есть столбец Point, строки группируются по его значению —
    % каждая группа образует отдельную эквивалентную точку КЗ. Если столбца нет,
    % возвращается одна точка (все строки суммируются), что эквивалентно
    % func_import_data.
    %
    % points — структурный массив с полями:
    %   name, Z1, Z2, Z0, E, U_nom, scInfo (Z_base, inputFile, z2_from_excel, nElements)

    if nargin < 1
        filename = 'network_parameters.xlsx';
    end

    [~, fn, ext] = fileparts(filename);
    inputFile = [fn ext];

    [headers, rows] = sc_read_table(filename);

    pointCol = sc_table_text(headers, rows, 'Point');
    R1 = sc_table_numeric(headers, rows, 'R1', false);
    X1 = sc_table_numeric(headers, rows, 'X1', false);
    R0 = sc_table_numeric(headers, rows, 'R0', false);
    X0 = sc_table_numeric(headers, rows, 'X0', false);
    Un = sc_table_numeric(headers, rows, 'U_nom', false);
    R2 = sc_table_numeric(headers, rows, 'R2', true);
    X2 = sc_table_numeric(headers, rows, 'X2', true);

    nRows = numel(R1);
    if isempty(pointCol)
        groupKeys = {'1'};
        groupIdx = {1:nRows};
    else
        [groupKeys, groupIdx] = group_by(pointCol);
    end

    hasZ2 = ~isempty(R2) && ~isempty(X2);

    points = struct('name', {}, 'Z1', {}, 'Z2', {}, 'Z0', {}, ...
        'E', {}, 'U_nom', {}, 'scInfo', {});

    for g = 1:numel(groupKeys)
        idx = groupIdx{g};
        U_nom = Un(idx(1));
        if ~(isfinite(U_nom) && U_nom > 0)
            error('func_import_points: U_nom должно быть положительным (точка %s).', groupKeys{g});
        end
        Z_base = (U_nom^2) / 100;

        Z1 = sum((R1(idx) + 1j * X1(idx)) / Z_base);
        Z0 = sum((R0(idx) + 1j * X0(idx)) / Z_base);
        if hasZ2
            Z2 = sum((R2(idx) + 1j * X2(idx)) / Z_base);
            z2flag = true;
        else
            Z2 = Z1;
            z2flag = false;
        end

        scInfo = struct('Z_base', Z_base, 'inputFile', inputFile, ...
            'z2_from_excel', z2flag, 'nElements', numel(idx));

        p.name = sprintf('Точка %s', groupKeys{g});
        p.Z1 = Z1;
        p.Z2 = Z2;
        p.Z0 = Z0;
        p.E = 1.05;
        p.U_nom = U_nom;
        p.scInfo = scInfo;
        points(g) = p; %#ok<AGROW>
    end

    fprintf('  Загружено точек КЗ: %d (элементов всего: %d)\n', numel(points), nRows);
end

function [keys, idxGroups] = group_by(labels)
    keys = {};
    idxGroups = {};
    for k = 1:numel(labels)
        lab = labels{k};
        if isempty(lab)
            lab = '1';
        end
        pos = find(strcmp(keys, lab), 1);
        if isempty(pos)
            keys{end + 1} = lab; %#ok<AGROW>
            idxGroups{end + 1} = k; %#ok<AGROW>
        else
            idxGroups{pos} = [idxGroups{pos}, k];
        end
    end
end
