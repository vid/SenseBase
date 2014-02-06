package org.wikifier;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Set;

public class MapList implements Iterable<String> {
	Map<String, List<String>> values = new HashMap<String, List<String>>();
	
	public Map<String, List<String>> getValues() {
		return values;
	}
	
	public void put(String key, String aValue) {
		List<String> l = get(key);
		if (l == null) {
			l = new ArrayList<String>();
		}
		l.add(aValue);
		values.put(key, l);
	}

	public Set<String> keySet() {
		return values.keySet();
	}

	public int size() {
		return keySet().size();
	}

	public List<String> get(String s) {
		return values.get(s);
	}

	public void put(String term, ArrayList<String> replaced) {
		values.put(term, replaced);
	}
	
	public String toString() {
		return values.toString();
	}

	@Override
	public Iterator<String> iterator() {
		return values.keySet().iterator();
	}
}
